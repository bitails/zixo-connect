import { SocketEventEnum } from './event';

export class SocketMessageModel {
  event: SocketEventEnum;
  id: number;
  callId: string;
  message: string[];
}
