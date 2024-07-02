import { SocketEventEnum } from './socket_event.enum';

export class SocketMessagemodel {
  event: SocketEventEnum;
  callId: string;
  id: number;
  message: string[];
}
