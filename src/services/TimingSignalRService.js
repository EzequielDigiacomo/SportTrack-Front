import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../utils/constants';
import { getStoredAuthToken } from '../utils/authHelpers';
import { clearPendingRaceStart, loadPendingRaceStart, savePendingRaceStart } from '../utils/timingMath';
import FaseService from './FaseService';

function resolveHubUrl() {
    const fromEnv = import.meta.env.VITE_SIGNALR_HUB_URL;
    if (fromEnv?.startsWith('http')) return fromEnv;
    if (fromEnv?.startsWith('/')) return fromEnv;
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}/hubs/timing`;
}

const SYNC_INTERVAL_MS = 60_000;
const SYNC_STALE_MS = 120_000;
const MAX_SAMPLE_RTT_MS = 1500;

class TimingSignalRService {
    constructor() {
        this.connection = null;
        this.currentFaseId = null;
        this.currentEventoId = null;
        this.serverOffset = 0;
        this.lastSyncAt = null;
        this.lastSyncSampleCount = 0;
        this.lastSyncMedianRtt = null;
        this.connectionPromise = null;
        this._connectGeneration = 0;
        this._intentionalDisconnect = false;
        this._stateCallbacks = [];
        this._reconnectedCallbacks = [];
        this._syncIntervalId = null;
        this._pendingStartRetryId = null;
        this.userName = "Usuario";
        this.role = "Espectador";

        this._presenceCallback = null;
        this._eventPresenceCallback = null;
        this._raceStartedCallback = null;
        this._raceResetCallback = null;
        this._raceFinishedCallback = null;
        this._raceInReviewCallback = null;
        this._timeReceivedCallback = null;
        this._globalResultStatusUpdatedCallback = null;
        this._globalRaceStartedCallback = null;
        this._globalRaceInReviewCallback = null;
        this._globalRaceOfficializedCallback = null;
        this._lapRecordedCallback = null;
        this._paymentCallback = null;
        this._resultadoActualizadoCallback = null;
        this._handlersRegistered = false;
    }

    onStateChange(callback) {
        this._stateCallbacks.push(callback);
        try {
            callback(this.getConnectionState());
        } catch (e) {}
        return () => {
            this._stateCallbacks = this._stateCallbacks.filter(c => c !== callback);
        };
    }

    onReconnected(callback) {
        this._reconnectedCallbacks.push(callback);
        return () => {
            this._reconnectedCallbacks = this._reconnectedCallbacks.filter(c => c !== callback);
        };
    }

    _notifyStateChange(state) {
        this._stateCallbacks.forEach(cb => {
            try { cb(state); } catch (e) {}
        });
        if (state === 'Connected') {
            this._startPeriodicSync();
            this._schedulePendingStartRetry();
        } else if (state === 'Disconnected') {
            this._stopPeriodicSync();
        }
    }

    _notifyReconnected() {
        this._reconnectedCallbacks.forEach(cb => {
            try { cb(); } catch (e) {}
        });
    }

    getConnectionState() {
        if (!this.connection) return "Disconnected";
        return this.connection.state;
    }

    getClockSyncStatus() {
        const ageMs = this.lastSyncAt == null ? null : Date.now() - this.lastSyncAt;
        return {
            offsetMs: this.serverOffset,
            lastSyncAt: this.lastSyncAt,
            ageMs,
            sampleCount: this.lastSyncSampleCount,
            medianRttMs: this.lastSyncMedianRtt,
            isStale: ageMs == null || ageMs > SYNC_STALE_MS,
            hasSynced: this.lastSyncAt != null
        };
    }

    async waitForConnection(timeoutMs = 8000) {
        if (!this.connection) return false;
        if (this.connection.state === signalR.HubConnectionState.Connected) return true;

        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (this._intentionalDisconnect) return false;
            if (this.connection.state === signalR.HubConnectionState.Connected) {
                return true;
            }
            if (this.connection.state === signalR.HubConnectionState.Disconnected) {
                return false;
            }
            await new Promise(r => setTimeout(r, 100));
        }
        return this.connection.state === signalR.HubConnectionState.Connected;
    }

    _ensureConnectionHandlers() {
        if (!this.connection || this._handlersRegistered) return;

        this.connection.on("paymentStatusChangeRequested", (data) => {
            if (this._paymentCallback) this._paymentCallback(data);
        });
        this.connection.on("paymentstatuschangerequested", (data) => {
            if (this._paymentCallback) this._paymentCallback(data);
        });

        this.connection.on("RacePresenceUpdated", (presenceList) => {
            if (this._presenceCallback) this._presenceCallback(presenceList);
        });

        this.connection.on("EventPresenceUpdated", (presenceList) => {
            if (this._eventPresenceCallback) this._eventPresenceCallback(presenceList);
        });

        this.connection.on("RaceStarted", (id, sTime) => {
            const serverDate = new Date(sTime);
            if (this._raceStartedCallback) this._raceStartedCallback(id, serverDate);
        });

        this.connection.on("RaceReset", (id) => {
            if (this._raceResetCallback) this._raceResetCallback(id);
        });

        this.connection.on("RaceFinished", (id) => {
            if (this._raceFinishedCallback) this._raceFinishedCallback(id);
        });

        this.connection.on("RaceInReview", (id) => {
            if (this._raceInReviewCallback) this._raceInReviewCallback(id);
        });
        this.connection.on("raceinreview", (id) => {
            if (this._raceInReviewCallback) this._raceInReviewCallback(id);
        });

        this.connection.on("TimeReceived", (resultadoId, timeStr, ms) => {
            if (this._timeReceivedCallback) this._timeReceivedCallback(resultadoId, timeStr, ms);
        });

        this.connection.on("GlobalResultStatusUpdated", (resId, status) => {
            if (this._globalResultStatusUpdatedCallback) this._globalResultStatusUpdatedCallback(resId, status);
        });

        const handleGlobalRaceStarted = (faseId, serverTime) => {
            if (this._globalRaceStartedCallback) this._globalRaceStartedCallback({ faseId, serverTime });
        };
        this.connection.on("globalRaceStarted", handleGlobalRaceStarted);
        this.connection.on("globalracestarted", handleGlobalRaceStarted);

        const handleGlobalRaceInReview = (fase) => {
            if (this._globalRaceInReviewCallback) this._globalRaceInReviewCallback(fase);
        };
        this.connection.on("globalRaceInReview", handleGlobalRaceInReview);
        this.connection.on("globalraceinreview", handleGlobalRaceInReview);

        const handleGlobalRaceOfficialized = (faseId) => {
            if (this._globalRaceOfficializedCallback) this._globalRaceOfficializedCallback(faseId);
        };
        this.connection.on("globalRaceOfficialized", handleGlobalRaceOfficialized);
        this.connection.on("globalraceofficialized", handleGlobalRaceOfficialized);

        this.connection.on("LapRecorded", (resultadoId, time) => {
            if (this._lapRecordedCallback) this._lapRecordedCallback(resultadoId, time);
        });

        const handleResultadoActualizado = (eventoPruebaId, resultado) => {
            if (this._resultadoActualizadoCallback) {
                this._resultadoActualizadoCallback(eventoPruebaId, resultado);
            }
        };
        this.connection.on("ResultadoActualizado", handleResultadoActualizado);
        this.connection.on("resultadoactualizado", handleResultadoActualizado);

        this.connection.onreconnecting(() => {
            this._notifyStateChange("Reconnecting");
        });

        this.connection.onreconnected(async () => {
            this._notifyStateChange("Connected");
            await this.syncClock();
            if (this.currentEventoId) {
                try {
                    await this.connection.invoke("JoinEventGroup", this.currentEventoId.toString(), this.userName, this.role);
                } catch (err) {
                    console.warn("[SignalR] Error re-joining event group after reconnect:", err);
                }
            }
            if (this.currentFaseId) {
                try {
                    await this.connection.invoke("JoinRaceGroup", this.currentFaseId, this.userName, this.role);
                } catch (err) {
                    console.warn("[SignalR] Error re-joining race group after reconnect:", err);
                }
            }
            this._notifyReconnected();
            await this.flushPendingRaceStart();
        });

        this.connection.onclose((error) => {
            if (this._intentionalDisconnect) {
                return;
            }
            if (error) {
                console.warn("[SignalR] Connection closed:", error);
            }
            this._notifyStateChange("Disconnected");
        });

        this._handlersRegistered = true;
    }

    _createConnection() {
        const hubUrl = resolveHubUrl();
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => getStoredAuthToken() || '',
                skipNegotiation: false
            })
            .configureLogging(signalR.LogLevel.Warning)
            .withAutomaticReconnect()
            .build();
        this._handlersRegistered = false;
        this._ensureConnectionHandlers();
    }

    _startPeriodicSync() {
        this._stopPeriodicSync();
        this._syncIntervalId = setInterval(() => {
            if (this.getConnectionState() === 'Connected') {
                this.syncClock().catch(() => {});
            }
        }, SYNC_INTERVAL_MS);
    }

    _stopPeriodicSync() {
        if (this._syncIntervalId) {
            clearInterval(this._syncIntervalId);
            this._syncIntervalId = null;
        }
    }

    _schedulePendingStartRetry() {
        if (this._pendingStartRetryId) return;
        this._pendingStartRetryId = setInterval(() => {
            this.flushPendingRaceStart().catch(() => {});
        }, 4000);
    }

    _stopPendingStartRetry() {
        if (this._pendingStartRetryId) {
            clearInterval(this._pendingStartRetryId);
            this._pendingStartRetryId = null;
        }
    }

    async connect(eventoId = null, faseId = null, userName = null, role = null) {
        this.userName = userName || this.userName || "Usuario";
        this.role = role || this.role || "Espectador";

        if (this.connectionPromise) {
            await this.connectionPromise;
        }

        const generation = ++this._connectGeneration;

        this.connectionPromise = (async () => {
            try {
                if (this._intentionalDisconnect || generation !== this._connectGeneration) {
                    return;
                }

                if (!this.connection) {
                    this._createConnection();
                }

                const state = this.connection.state;

                if (state === signalR.HubConnectionState.Disconnected) {
                    this._notifyStateChange("Connecting");
                    await this.connection.start();
                    if (generation !== this._connectGeneration || this._intentionalDisconnect) {
                        return;
                    }
                    this._notifyStateChange("Connected");
                    await this.syncClock();
                } else if (
                    state === signalR.HubConnectionState.Reconnecting ||
                    state === signalR.HubConnectionState.Connecting
                ) {
                    const connected = await this.waitForConnection();
                    if (!connected || generation !== this._connectGeneration) {
                        return;
                    }
                    this._notifyStateChange("Connected");
                }

                if (this.connection.state !== signalR.HubConnectionState.Connected) {
                    return;
                }

                if (eventoId) {
                    await this.connection.invoke("JoinEventGroup", eventoId.toString(), this.userName, this.role);
                    this.currentEventoId = eventoId.toString();
                } else {
                    this.currentEventoId = null;
                }

                if (faseId) {
                    await this.connection.invoke("JoinRaceGroup", faseId.toString(), this.userName, this.role);
                    this.currentFaseId = faseId.toString();
                } else {
                    this.currentFaseId = null;
                }

                await this.flushPendingRaceStart();
            } catch (err) {
                if (this._intentionalDisconnect || err?.name === 'AbortError') {
                    return;
                }
                console.warn("[SignalR] Connection error:", err);
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    async syncClock() {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;

        const SAMPLES = 5;
        const samples = [];

        for (let i = 0; i < SAMPLES; i++) {
            const start = Date.now();
            try {
                const serverTimeStr = await this.connection.invoke("GetServerTime");
                const end = Date.now();
                const rtt = end - start;
                if (rtt > MAX_SAMPLE_RTT_MS) {
                    await new Promise(r => setTimeout(r, 100));
                    continue;
                }
                const latency = rtt / 2;
                const serverDate = new Date(serverTimeStr);
                const offset = (serverDate.getTime() + latency) - end;
                samples.push({ offset, rtt });
                await new Promise(r => setTimeout(r, 100));
            } catch (err) {
                if (!this._intentionalDisconnect) {
                    console.warn("[Sync] Sample error:", err);
                }
                break;
            }
        }

        if (samples.length > 0) {
            samples.sort((a, b) => a.offset - b.offset);
            const mid = samples[Math.floor(samples.length / 2)];
            this.serverOffset = mid.offset;
            this.lastSyncAt = Date.now();
            this.lastSyncSampleCount = samples.length;
            const rtts = samples.map(s => s.rtt).sort((a, b) => a - b);
            this.lastSyncMedianRtt = rtts[Math.floor(rtts.length / 2)];
        }
    }

    getSyncedNow() {
        return new Date(Date.now() + this.serverOffset);
    }

    async joinRaceGroup(faseId) {
        if (!this.connection || !faseId) return;
        await this.connection.invoke("JoinRaceGroup", faseId.toString(), this.userName, this.role);
    }

    async requestStartRace(faseId, startTime = null) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            await this.connect(null, faseId);
        }
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            throw new Error("No hay conexión activa con el servidor de tiempos");
        }
        const stamp = startTime instanceof Date ? startTime : this.getSyncedNow();
        await this.connection.invoke("RequestStartRace", parseInt(faseId), stamp.toISOString());
        clearPendingRaceStart(faseId);
        return stamp;
    }

    /**
     * Entrega t0 (instante del click) por SignalR → HTTP → cola sessionStorage.
     * Nunca regenera t0.
     */
    async deliverRaceStart(faseId, startStamp) {
        const stamp = startStamp instanceof Date ? startStamp : new Date(startStamp);
        const t0Iso = stamp.toISOString();
        savePendingRaceStart(faseId, t0Iso);

        try {
            if (this.getConnectionState() !== 'Connected') {
                await this.connect(this.currentEventoId, faseId, this.userName, this.role);
            }
            if (this.getConnectionState() === 'Connected') {
                await this.connection.invoke("RequestStartRace", parseInt(faseId), t0Iso);
                clearPendingRaceStart(faseId);
                return { ok: true, channel: 'signalr', stamp };
            }
        } catch (err) {
            console.warn("[Timing] SignalR start failed, trying HTTP:", err);
        }

        try {
            const updated = await FaseService.iniciar(faseId, t0Iso);
            clearPendingRaceStart(faseId);
            return { ok: true, channel: 'http', stamp, updated };
        } catch (httpErr) {
            console.warn("[Timing] HTTP start failed, queued for retry:", httpErr);
            this._schedulePendingStartRetry();
            return { ok: false, channel: 'pending', stamp, error: httpErr };
        }
    }

    async flushPendingRaceStart() {
        const pending = loadPendingRaceStart();
        if (!pending) return false;
        const result = await this.deliverRaceStart(pending.faseId, pending.t0Iso);
        return result.ok;
    }

    async requestResetRace(faseId) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            await this.connect(null, faseId);
        }
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            throw new Error("No hay conexión activa con el servidor de tiempos");
        }
        await this.connection.invoke("RequestResetRace", parseInt(faseId));
    }

    async sendTime(faseId, resultadoId, timeStr, ms) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            try {
                await this.connect(null, faseId);
            } catch {}
        }
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
        await this.connection.invoke("SendTime", faseId.toString(), resultadoId.toString(), timeStr, ms);
    }

    onRacePresenceUpdated(callback) {
        this._presenceCallback = callback;
    }

    onEventPresenceUpdated(callback) {
        this._eventPresenceCallback = callback;
    }

    onRaceStarted(callback) {
        this._raceStartedCallback = callback;
    }

    onLapRecorded(callback) {
        this._lapRecordedCallback = callback;
    }

    onRaceFinished(callback) {
        this._raceFinishedCallback = callback;
    }

    onGlobalRaceStarted(callback) {
        this._globalRaceStartedCallback = callback;
    }

    onGlobalRaceInReview(callback) {
        this._globalRaceInReviewCallback = callback;
    }

    onGlobalRaceOfficialized(callback) {
        this._globalRaceOfficializedCallback = callback;
    }

    onRaceInReview(callback) {
        this._raceInReviewCallback = callback;
    }

    onRaceReset(callback) {
        this._raceResetCallback = callback;
    }

    onTimeReceived(callback) {
        this._timeReceivedCallback = callback;
    }

    async updateResultStatus(faseId, resultadoId, status) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            throw new Error("No hay conexión con el servidor de tiempos");
        }
        await this.connection.invoke("UpdateResultStatus", faseId.toString(), resultadoId.toString(), status);
    }

    onResultStatusUpdated() {
        // Obsoleto
    }

    onGlobalResultStatusUpdated(callback) {
        this._globalResultStatusUpdatedCallback = callback;
    }

    onResultadoActualizado(callback) {
        this._resultadoActualizadoCallback = callback;
    }

    onPaymentStatusChangeRequested(callback) {
        this._paymentCallback = callback;
    }

    async requestPaymentStatusChange(clubNombre, clubId) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            await this.connect();
        }
        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            await this.connection.invoke("RequestPaymentStatusChange", clubNombre.toString(), clubId.toString());
        }
    }

    async disconnect() {
        this._connectGeneration++;
        this._intentionalDisconnect = true;
        this.connectionPromise = null;
        this._stopPeriodicSync();
        this._stopPendingStartRetry();

        const conn = this.connection;
        this.connection = null;
        this.currentFaseId = null;
        this.currentEventoId = null;
        this._handlersRegistered = false;

        if (conn) {
            try {
                await conn.stop();
            } catch {
                // ignore
            }
        }

        this._notifyStateChange("Disconnected");
        this._intentionalDisconnect = false;
    }
}

const timingSignalRService = new TimingSignalRService();
export default timingSignalRService;
