import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../utils/constants';

class TimingSignalRService {
    constructor() {
        this.connection = null;
        this.currentFaseId = null;
        this.serverOffset = 0;
        this.connectionPromise = null;
        this._stateCallbacks = [];
        this.userName = "Usuario";
        this.role = "Espectador";

        // Callback registers (to prevent race conditions)
        this._presenceCallback = null;
        this._eventPresenceCallback = null;
        this._raceStartedCallback = null;
        this._raceResetCallback = null;
        this._raceFinishedCallback = null;
        this._timeReceivedCallback = null;
        this._globalResultStatusUpdatedCallback = null;
        this._globalRaceStartedCallback = null;
        this._globalRaceInReviewCallback = null;
        this._globalRaceOfficializedCallback = null;
        this._lapRecordedCallback = null;
        this._paymentCallback = null;
    }

    onStateChange(callback) {
        this._stateCallbacks.push(callback);
        try {
            callback(this.getConnectionState());
        } catch(e) {}
        return () => {
            this._stateCallbacks = this._stateCallbacks.filter(c => c !== callback);
        };
    }

    _notifyStateChange(state) {
        this._stateCallbacks.forEach(cb => {
            try { cb(state); } catch (e) {}
        });
    }

    getConnectionState() {
        if (!this.connection) return "Disconnected";
        return this.connection.state;
    }

    async waitForConnection(timeoutMs = 5000) {
        if (!this.connection) return false;
        if (this.connection.state === signalR.HubConnectionState.Connected) return true;

        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (this.connection.state === signalR.HubConnectionState.Connected) {
                return true;
            }
            await new Promise(r => setTimeout(r, 100));
        }
        return false;
    }

    async connect(eventoId = null, faseId = null, userName = null, role = null) {
        this.userName = userName || this.userName || "Usuario";
        this.role = role || this.role || "Espectador";

        // Si ya hay una operación en curso, esperamos
        if (this.connectionPromise) {
            await this.connectionPromise;
        }

        this.connectionPromise = (async () => {
            try {
                const hubUrl = API_BASE_URL.replace('/api', '') + '/hubs/timing';

                if (!this.connection) {
                    this.connection = new signalR.HubConnectionBuilder()
                        .withUrl(hubUrl, {
                            accessTokenFactory: () => localStorage.getItem('sporttrack_auth_token'),
                            skipNegotiation: false
                        })
                        .configureLogging(signalR.LogLevel.Warning)
                        .withAutomaticReconnect()
                        .build();

                    // Registrar todos los handlers de manera permanente ANTES de iniciar
                    this.connection.on("paymentStatusChangeRequested", (data) => {
                        if (this._paymentCallback) this._paymentCallback(data);
                    });
                    this.connection.on("paymentstatuschangerequested", (data) => {
                        if (this._paymentCallback) this._paymentCallback(data);
                    });

                    this.connection.on("RacePresenceUpdated", (presenceList) => {
                        console.log("[SignalR] Race Presence Updated:", presenceList);
                        if (this._presenceCallback) this._presenceCallback(presenceList);
                    });

                    this.connection.on("EventPresenceUpdated", (presenceList) => {
                        console.log("[SignalR] Event Presence Updated:", presenceList);
                        if (this._eventPresenceCallback) this._eventPresenceCallback(presenceList);
                    });

                    this.connection.on("RaceStarted", (id, sTime) => {
                        console.log("[SignalR] Race Started:", id, sTime);
                        const serverDate = new Date(sTime);
                        if (this._raceStartedCallback) this._raceStartedCallback(id, serverDate);
                    });

                    this.connection.on("RaceReset", (id) => {
                        console.log("[SignalR] Race Reset:", id);
                        if (this._raceResetCallback) this._raceResetCallback(id);
                    });

                    this.connection.on("RaceFinished", (id) => {
                        console.log("[SignalR] Race Finished:", id);
                        if (this._raceFinishedCallback) this._raceFinishedCallback(id);
                    });

                    this.connection.on("TimeReceived", (resultadoId, timeStr, ms) => {
                        console.log("[SignalR] Time Received:", resultadoId, timeStr, ms);
                        if (this._timeReceivedCallback) this._timeReceivedCallback(resultadoId, timeStr, ms);
                    });

                    this.connection.on("GlobalResultStatusUpdated", (resId, status) => {
                        console.log("[SignalR] Result Status Updated:", resId, status);
                        if (this._globalResultStatusUpdatedCallback) this._globalResultStatusUpdatedCallback(resId, status);
                    });

                    const handleGlobalRaceStarted = (faseId, serverTime) => {
                        console.log("[SignalR] Global Race Started:", faseId, serverTime);
                        if (this._globalRaceStartedCallback) this._globalRaceStartedCallback({ faseId, serverTime });
                    };
                    this.connection.on("globalRaceStarted", handleGlobalRaceStarted);
                    this.connection.on("globalracestarted", handleGlobalRaceStarted);

                    const handleGlobalRaceInReview = (fase) => {
                        console.log("[SignalR] Global Race In Review:", fase);
                        if (this._globalRaceInReviewCallback) this._globalRaceInReviewCallback(fase);
                    };
                    this.connection.on("globalRaceInReview", handleGlobalRaceInReview);
                    this.connection.on("globalraceinreview", handleGlobalRaceInReview);

                    const handleGlobalRaceOfficialized = (faseId) => {
                        console.log("[SignalR] Global Race Officialized:", faseId);
                        if (this._globalRaceOfficializedCallback) this._globalRaceOfficializedCallback(faseId);
                    };
                    this.connection.on("globalRaceOfficialized", handleGlobalRaceOfficialized);
                    this.connection.on("globalraceofficialized", handleGlobalRaceOfficialized);

                    this.connection.on("LapRecorded", (resultadoId, time) => {
                        if (this._lapRecordedCallback) this._lapRecordedCallback(resultadoId, time);
                    });

                    // Notificaciones de reconexión para la UI
                    this.connection.onreconnecting((error) => {
                        console.warn("[SignalR] Reconnecting due to error:", error);
                        this._notifyStateChange("Reconnecting");
                    });

                    this.connection.onreconnected(async (connectionId) => {
                        console.log("[SignalR] Reconnected successfully. Re-joining groups and syncing clock.");
                        this._notifyStateChange("Connected");
                        await this.syncClock();
                        if (this.currentEventoId) {
                            try {
                                await this.connection.invoke("JoinEventGroup", this.currentEventoId.toString(), this.userName, this.role);
                            } catch (err) {
                                console.error("[SignalR] Error re-joining event group after reconnect:", err);
                            }
                        }
                        if (this.currentFaseId) {
                            try {
                                await this.connection.invoke("JoinRaceGroup", this.currentFaseId, this.userName, this.role);
                            } catch (err) {
                                console.error("[SignalR] Error re-joining race group after reconnect:", err);
                            }
                        }
                    });

                    this.connection.onclose((error) => {
                        console.error("[SignalR] Connection closed:", error);
                        this._notifyStateChange("Disconnected");
                    });
                }

                // Iniciar si está desconectado
                if (this.connection.state === signalR.HubConnectionState.Disconnected) {
                    this._notifyStateChange("Connecting");
                    await this.connection.start();
                    this._notifyStateChange("Connected");
                    await this.syncClock();
                } else if (this.connection.state === signalR.HubConnectionState.Reconnecting || this.connection.state === signalR.HubConnectionState.Connecting) {
                    // Si está en reconexión o conectando, esperamos a que termine
                    const connected = await this.waitForConnection(4000);
                    if (!connected) {
                        // Si se queda trabado en reconexión, forzamos un stop y restart completo
                        console.warn("[SignalR] Connection stuck. Forcing restart.");
                        this._notifyStateChange("Connecting");
                        try {
                            await this.connection.stop();
                        } catch {}
                        await this.connection.start();
                        this._notifyStateChange("Connected");
                        await this.syncClock();
                    } else {
                        this._notifyStateChange("Connected");
                    }
                }

                // Si pedimos un evento específico, nos unimos siempre para asegurar presencia a nivel de evento
                if (eventoId) {
                    if (this.connection.state === signalR.HubConnectionState.Connected) {
                        console.log(`[SignalR] Joining event group: event_${eventoId} for user ${this.userName} (${this.role})`);
                        await this.connection.invoke("JoinEventGroup", eventoId.toString(), this.userName, this.role);
                        this.currentEventoId = eventoId.toString();
                    }
                } else {
                    this.currentEventoId = null;
                }

                // Si pedimos una fase específica, nos unimos siempre para asegurar presencia a nivel de carrera
                if (faseId) {
                    if (this.connection.state === signalR.HubConnectionState.Connected) {
                        console.log(`[SignalR] Joining race group: race_${faseId} for user ${this.userName} (${this.role})`);
                        await this.connection.invoke("JoinRaceGroup", faseId.toString(), this.userName, this.role);
                        this.currentFaseId = faseId.toString();
                    }
                } else {
                    this.currentFaseId = null;
                }
            } catch (err) {
                console.error("[SignalR] Connection Error:", err);
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    async syncClock() {
        if (!this.connection) return;
        
        const SAMPLES = 5;
        const offsets = [];

        for (let i = 0; i < SAMPLES; i++) {
            const start = Date.now();
            try {
                // Invocamos el método que ahora retorna el valor directamente
                const serverTimeStr = await this.connection.invoke("GetServerTime");
                const end = Date.now();
                
                const latency = (end - start) / 2;
                const serverDate = new Date(serverTimeStr);
                
                // Offset = Tiempo Real Server - Tiempo Local Cliente
                const offset = (serverDate.getTime() + latency) - end;
                offsets.push(offset);
                
                // Pequeña espera entre muestras
                await new Promise(r => setTimeout(r, 100));
            } catch (err) {
                console.error("[Sync] Sample error:", err);
            }
        }

        if (offsets.length > 0) {
            // Usamos la mediana para ignorar picos de red
            offsets.sort((a, b) => a - b);
            this.serverOffset = offsets[Math.floor(offsets.length / 2)];
        }
    }

    // Retorna la hora "del servidor" calculada localmente
    getSyncedNow() {
        return new Date(Date.now() + this.serverOffset);
    }

    async joinRaceGroup(faseId) {
        if (!this.connection || !faseId) return;
        await this.connection.invoke("JoinRaceGroup", faseId.toString(), this.userName, this.role);
    }

    // Métodos de acción ultra-rápidos vía WebSocket
    async requestStartRace(faseId) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            await this.connect(faseId);
        }
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            throw new Error("No hay conexión activa con el servidor de tiempos");
        }
        // Capturamos la hora EXACTA del click (ajustada al servidor)
        const startTime = this.getSyncedNow();
        await this.connection.invoke("RequestStartRace", parseInt(faseId), startTime.toISOString());
    }

    async requestResetRace(faseId) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            await this.connect(faseId);
        }
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            throw new Error("No hay conexión activa con el servidor de tiempos");
        }
        await this.connection.invoke("RequestResetRace", parseInt(faseId));
    }

    async sendTime(faseId, resultadoId, timeStr, ms) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            try {
                await this.connect(faseId);
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
        // Obsoleto, delegar a global
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

    onResultStatusUpdated(callback) {
        // Obsoleto, delegar a global
    }

    onGlobalResultStatusUpdated(callback) {
        this._globalResultStatusUpdatedCallback = callback;
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

    disconnect() {
        if (this.connection) {
            this.connection.stop();
            this.connection = null;
            this.currentFaseId = null;
        }
    }
}

const timingSignalRService = new TimingSignalRService();
export default timingSignalRService;
