import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../utils/constants';

class TimingSignalRService {
    constructor() {
        this.connection = null;
        this.currentFaseId = null;
        this.serverOffset = 0; // Diferencia en ms entre server y cliente
    }

    async connect(faseId) {
        if (this.currentFaseId === faseId.toString() && this.connection?.state === signalR.HubConnectionState.Connected) {
            return;
        }

        if (this.connection) {
            try {
                if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
                    await this.connection.stop();
                }
            } catch (err) {
                console.warn("SignalR stop error (non-critical):", err);
            }
            this.connection = null;
        }

        const token = localStorage.getItem('sporttrack_auth_token');
        const hubUrl = API_BASE_URL.replace('/api', '') + '/hubs/timing';

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => token,
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        try {
            await this.connection.start();
            console.log("TimingHub Connected!");
            
            // Sincronizar reloj inmediatamente después de conectar
            await this.syncClock();
            
            await this.joinRaceGroup(faseId);
            this.currentFaseId = faseId.toString();
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log("SignalR connection aborted");
            } else {
                console.error("TimingHub Connection Error: ", err);
                throw err;
            }
        }
    }

    async syncClock() {
        if (!this.connection) return;
        
        const start = Date.now();
        
        // Escuchamos la respuesta del server time
        this.connection.on("ReceiveServerTime", (serverTime) => {
            const end = Date.now();
            const latency = (end - start) / 2;
            const serverDate = new Date(serverTime);
            // Offset = Tiempo Real Server - Tiempo Local Cliente
            this.serverOffset = (serverDate.getTime() + latency) - end;
            console.log(`[Sync] Latency: ${latency}ms, Clock Offset: ${this.serverOffset}ms`);
        });

        await this.connection.invoke("GetServerTime");
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
        await this.connection.invoke("RequestStartRace", parseInt(faseId));
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
        this.connection.on("RaceStarted", (id, sTime) => {
            // Ajustamos sTime si el servidor lo mandó sin Z (ISO string local del server)
            const serverDate = new Date(sTime);
            callback(id, serverDate);
        });
    }

    onLapRecorded(callback) {
        if (!this.connection) return;
        this.connection.on("LapRecorded", callback);
    }

    onRaceFinished(callback) {
        if (!this.connection) return;
        this.connection.on("RaceFinished", callback);
    }

    onGlobalRaceStarted(callback) {
        if (!this.connection) return;
        this.connection.on("GlobalRaceStarted", (faseId, serverTime) => {
            console.log(`Global Event: Race (ID: ${faseId}) started at ${serverTime}`);
            callback({ faseId, serverTime });
        });
    }

    onRaceReset(callback) {
        if (!this.connection) return;
        this.connection.on("RaceReset", callback);
    }

    onTimeReceived(callback) {
        if (!this.connection) return;
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
