import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../utils/constants';

class TimingSignalRService {
    constructor() {
        this.connection = null;
        this.currentFaseId = null;
        this.serverOffset = 0;
        this.connectionPromise = null;
    }

    async connect(faseId = null) {
        // Si ya hay una operación en curso, esperamos
        if (this.connectionPromise) {
            await this.connectionPromise;
        }

        this.connectionPromise = (async () => {
            try {
                const token = localStorage.getItem('sporttrack_auth_token');
                const hubUrl = API_BASE_URL.replace('/api', '') + '/hubs/timing';

                if (!this.connection) {
                    this.connection = new signalR.HubConnectionBuilder()
                        .withUrl(hubUrl, {
                            accessTokenFactory: () => token,
                            skipNegotiation: false,
                            transport: signalR.HttpTransportType.WebSockets
                        })
                        .withAutomaticReconnect()
                        .build();
                }

                // Iniciar si está desconectado
                if (this.connection.state === signalR.HubConnectionState.Disconnected) {
                    await this.connection.start();
                    console.log("[SignalR] Connected!");
                    await this.syncClock();
                }

                // Si pedimos una fase específica y no es la actual, nos unimos
                if (faseId && this.currentFaseId !== faseId.toString()) {
                    await this.connection.invoke("JoinRaceGroup", faseId.toString());
                    this.currentFaseId = faseId.toString();
                    console.log(`[SignalR] Joined group: race_${faseId}`);
                } else if (!faseId) {
                    this.currentFaseId = null;
                }
            } catch (err) {
                console.error("[SignalR] Connection Error:", err);
                // No relanzamos para no romper el flujo de la UI, pero lo logueamos
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    async syncClock() {
        if (!this.connection) return;
        
        console.log("[Sync] Starting clock synchronization...");
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
            console.log(`[Sync] Finished. Median Clock Offset: ${this.serverOffset}ms (from ${offsets.length} samples)`);
        }
    }

    // Retorna la hora "del servidor" calculada localmente
    getSyncedNow() {
        return new Date(Date.now() + this.serverOffset);
    }

    async joinRaceGroup(faseId) {
        if (!this.connection || !faseId) return;
        await this.connection.invoke("JoinRaceGroup", faseId.toString());
    }

    // Métodos de acción ultra-rápidos vía WebSocket
    async requestStartRace(faseId) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            throw new Error("No hay conexión activa con el servidor de tiempos");
        }
        // Capturamos la hora EXACTA del click (ajustada al servidor)
        const startTime = this.getSyncedNow();
        await this.connection.invoke("RequestStartRace", parseInt(faseId), startTime.toISOString());
    }

    async requestResetRace(faseId) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            throw new Error("No hay conexión activa con el servidor de tiempos");
        }
        await this.connection.invoke("RequestResetRace", parseInt(faseId));
    }

    async sendTime(faseId, resultadoId, timeStr, ms) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
        await this.connection.invoke("SendTime", faseId.toString(), resultadoId.toString(), timeStr, ms);
    }

    onRaceStarted(callback) {
        if (!this.connection) return;
        this.connection.off("RaceStarted");
        this.connection.on("RaceStarted", (id, sTime) => {
            // Ajustamos sTime si el servidor lo mandó sin Z (ISO string local del server)
            const serverDate = new Date(sTime);
            callback(id, serverDate);
        });
    }

    onLapRecorded(callback) {
        if (!this.connection) return;
        this.connection.off("LapRecorded");
        this.connection.on("LapRecorded", callback);
    }

    onRaceFinished(callback) {
        if (!this.connection) return;
        this.connection.off("RaceFinished");
        this.connection.on("RaceFinished", callback);
    }

    onGlobalRaceStarted(callback) {
        if (!this.connection) return;
        const handler = (faseId, serverTime) => {
            console.log(`Global Event: Race (ID: ${faseId}) started at ${serverTime}`);
            callback({ faseId, serverTime });
        };
        this.connection.off("globalRaceStarted");
        this.connection.off("globalracestarted");
        this.connection.on("globalRaceStarted", handler);
        this.connection.on("globalracestarted", handler);
    }

    onGlobalRaceInReview(callback) {
        if (!this.connection) return;
        const handler = (fase) => {
            console.log(`Global Event: Race (ID: ${fase.id}) in review`);
            callback(fase);
        };
        this.connection.off("globalRaceInReview");
        this.connection.off("globalraceinreview");
        this.connection.on("globalRaceInReview", handler);
        this.connection.on("globalraceinreview", handler);
    }

    onGlobalRaceOfficialized(callback) {
        if (!this.connection) return;
        const handler = (faseId) => {
            console.log(`Global Event: Race (ID: ${faseId}) officialized`);
            callback(faseId);
        };
        this.connection.off("globalRaceOfficialized");
        this.connection.off("globalraceofficialized");
        this.connection.on("globalRaceOfficialized", handler);
        this.connection.on("globalraceofficialized", handler);
    }

    onRaceInReview(callback) {
        if (!this.connection) return;
        this.connection.off("RaceInReview");
        this.connection.on("RaceInReview", callback);
    }

    onRaceReset(callback) {
        if (!this.connection) return;
        this.connection.off("RaceReset");
        this.connection.on("RaceReset", callback);
    }

    onTimeReceived(callback) {
        if (!this.connection) return;
        this.connection.off("TimeReceived");
        this.connection.on("TimeReceived", callback);
    }

    async updateResultStatus(faseId, resultadoId, status) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            throw new Error("No hay conexión con el servidor de tiempos");
        }
        await this.connection.invoke("UpdateResultStatus", faseId.toString(), resultadoId.toString(), status);
    }

    onResultStatusUpdated(callback) {
        if (!this.connection) return;
        this.connection.off("ResultStatusUpdated");
        this.connection.on("ResultStatusUpdated", callback);
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
