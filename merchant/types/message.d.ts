import { SocketEventEnum } from './socket_event.dto';

export class SocketMessagemodel {
  event: SocketEventEnum;
  callId: string;
  id: number;
  message: string[];
}
