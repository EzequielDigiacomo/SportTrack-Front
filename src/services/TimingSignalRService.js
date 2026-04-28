import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../utils/constants';

class TimingSignalRService {
    constructor() {
        this.connection = null;
        this.currentFaseId = null;
    }

    async connect(faseId) {
        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            if (this.currentFaseId === faseId.toString()) return;
            await this.leaveRaceGroup(this.currentFaseId);
        }

        const token = localStorage.getItem('sporttrack_auth_token');
        const hubUrl = API_BASE_URL.replace('/api', '') + '/hubs/timing';

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        try {
            await this.connection.start();
            console.log("TimingHub Connected!");
            await this.joinRaceGroup(faseId);
            this.currentFaseId = faseId.toString();
        } catch (err) {
            console.error("TimingHub Connection Error: ", err);
            throw err;
        }
    }

    async joinRaceGroup(faseId) {
        if (!this.connection || !faseId) return;
        await this.connection.invoke("JoinRaceGroup", faseId.toString());
    }

    async leaveRaceGroup(faseId) {
        if (!this.connection || !faseId) return;
        if (this.connection.state === signalR.HubConnectionState.Connected) {
            await this.connection.invoke("LeaveRaceGroup", faseId.toString());
        }
    }

    async sendTime(faseId, resultadoId, timeStr, ms) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
        await this.connection.invoke("SendTime", faseId.toString(), resultadoId.toString(), timeStr, ms);
    }

    onRaceStarted(callback) {
        if (!this.connection) return;
        this.connection.on("RaceStarted", callback);
    }

    onLapRecorded(callback) {
        if (!this.connection) return;
        this.connection.on("LapRecorded", callback);
    }

    onRaceFinished(callback) {
        if (!this.connection) return;
        this.connection.on("RaceFinished", callback);
    }

    onRaceInReview(callback) {
        if (!this.connection) return;
        this.connection.on("RaceInReview", callback);
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
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
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
