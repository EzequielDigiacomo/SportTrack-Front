/**
 * @deprecated El hub `/hubs/results` no existe en el API.
 * Usar TimingSignalRService → `/hubs/timing`.
 * LiveResults ya migró; este archivo queda solo por compatibilidad temporal.
 */
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../utils/constants';
import { getStoredAuthToken } from '../utils/authHelpers';

class SignalRService {
    constructor() {
        this.connection = null;
        this.currentGroupId = null;
        console.warn('[SignalRService] Deprecated: use TimingSignalRService (/hubs/timing).');
    }

    async connect() {
        // Si ya está conectada, no hacemos nada
        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            return;
        }

        // Si ya hay una conexión en progreso, esperamos a esa misma promesa
        if (this.connectingPromise) {
            return this.connectingPromise;
        }

        // Si la conexión existe pero no está conectada (ej: se cayó), 
        // no la recreamos, simplemente intentamos start() si está en estado 'Disconnected'
        if (!this.connection) {
            const hubUrl = API_BASE_URL.replace(/\/api\/?$/, '') + '/hubs/timing';

            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl, {
                    accessTokenFactory: () => getStoredAuthToken() || ''
                })
                .configureLogging(signalR.LogLevel.Warning)
                .withAutomaticReconnect()
                .build();
        }

        // Aseguramos que solo un llamador dispare el start()
        this.connectingPromise = (async () => {
            try {
                if (this.connection.state === signalR.HubConnectionState.Disconnected) {
                    await this.connection.start();
                }
            } catch (err) {
                console.error("SignalR Connection Error: ", err);
                throw err;
            } finally {
                this.connectingPromise = null;
            }
        })();

        return this.connectingPromise;
    }

    async joinEventGroup(eventId) {
        if (!eventId) return;
        try {
            await this.connect();
            
            if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
                console.warn("No se pudo unir al grupo: SignalR no está conectado.");
                return;
            }
 
            if (this.currentGroupId === eventId.toString()) return;
 
            if (this.currentGroupId) {
                try {
                    await this.connection.invoke("LeaveRaceGroup", this.currentGroupId);
                } catch (e) { console.warn("Error LeaveRaceGroup:", e); }
            }
 
            await this.connection.invoke("JoinRaceGroup", eventId.toString());
            this.currentGroupId = eventId.toString();
        } catch (e) {
            console.error("Error in joinEventGroup:", e);
        }
    }
 
    async leaveEventGroup(eventId) {
        if (!eventId || !this.connection) return;
        try {
            if (this.connection.state === signalR.HubConnectionState.Connected) {
                await this.connection.invoke("LeaveRaceGroup", eventId.toString());
            }
            if (this.currentGroupId === eventId.toString()) {
                this.currentGroupId = null;
            }
        } catch (e) {
            console.error("Error in leaveEventGroup:", e);
        }
    }

    onResultUpdated(callback) {
        if (!this.connection) return;
        
        // El backend NotificadorResultados envia el evento mediante "RecibirResultado"
        this.connection.off("RecibirResultado");
        this.connection.on("RecibirResultado", callback);
    }
    
    disconnect() {
        if (this.connection) {
            this.connection.stop();
            this.connection = null;
            this.currentGroupId = null;
        }
    }
}

const signalRServiceInstance = new SignalRService();
export default signalRServiceInstance;
