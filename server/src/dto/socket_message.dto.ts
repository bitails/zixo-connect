import { SocketEventEnum } from "./socket_event.dto";


export class SocketMessagemodel {
    event: SocketEventEnum;
    id: number;
    callId: string;
    message: string[];

    constructor(id: number, event: SocketEventEnum, message: string[]) {
        this.id = id;
        this.event = event;
        this.message = message;
    }
}
