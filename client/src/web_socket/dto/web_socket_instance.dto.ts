import { WebSocket } from 'ws';

export class WebSocketInstance {
    webSocket: WebSocket;
    reconnectInterval: number;
    url: string
}
