import { SocketEventEnum } from "./socket_event.enum";


export class SocketMessagemodel {
    event: SocketEventEnum;
    callId: string;
    id: number;
    message: string[];

    constructor(id: number, event: SocketEventEnum, callId: string, message: string[]) {
        this.id = id;
        this.event = event;
        this.message = message;
        this.callId = callId;
    }
}
