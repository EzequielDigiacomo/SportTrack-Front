import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../utils/constants';

class SignalRService {
    constructor() {
        this.connection = null;
        this.currentGroupId = null;
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
            const token = localStorage.getItem('sporttrack_auth_token');
            // Usamos la URL absoluta si es posible, o la del proxy
            const hubUrl = API_BASE_URL.replace('/api', '') + '/hubs/results';

            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl, {
                    accessTokenFactory: () => token
                })
                .withAutomaticReconnect()
                .build();
        }

        // Aseguramos que solo un llamador dispare el start()
        this.connectingPromise = (async () => {
            try {
                if (this.connection.state === signalR.HubConnectionState.Disconnected) {
                    await this.connection.start();
                    console.log("SignalR Connected!");
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
                    await this.connection.invoke("LeaveEventGroup", this.currentGroupId);
                } catch (e) { console.warn("Error LeaveEventGroup:", e); }
            }

            await this.connection.invoke("JoinEventGroup", eventId.toString());
            this.currentGroupId = eventId.toString();
            console.log(`Joined SignalR group for event-prueba: ${eventId}`);
        } catch (e) {
            console.error("Error in joinEventGroup:", e);
        }
    }

    async leaveEventGroup(eventId) {
        if (!eventId || !this.connection) return;
        try {
            if (this.connection.state === signalR.HubConnectionState.Connected) {
                await this.connection.invoke("LeaveEventGroup", eventId.toString());
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
