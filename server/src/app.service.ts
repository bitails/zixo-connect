import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as ngrok from '@ngrok/ngrok';
import * as http from 'http';
import * as WebSocket from 'ws';
import { AppConfigService } from './app.config.service';
import { UserStatusResDto } from './dto/user/status.dto';
import { SocketMessageModel } from 'type/socket/message';
import { SocketEventEnum } from 'type/socket/event';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private server: http.Server;
  private wss: WebSocket.Server;
  private ngrokListener: ngrok.Listener;
  private users = new Map<string, WebSocket>();

  constructor(private appConfigService: AppConfigService) {}

  async onModuleInit() {
    this.setupHttpServer();
    this.setupWebSocketServer();

    this.server.listen(this.appConfigService.applicationSocketPort, () =>
      Logger.debug(
        `Node.js web server at ${this.appConfigService.applicationSocketPort} is running...`,
      ),
    );

    try {
      this.ngrokListener = await ngrok.connect({
        addr: this.appConfigService.applicationSocketPort,
        authtoken: this.appConfigService.ngrokToken,
      });
      Logger.debug(`Ingress established at: ${this.ngrokListener.url()}`);
    } catch (error) {
      Logger.error('Failed to establish ngrok connection:', error);
    }
  }

  onModuleDestroy() {
    if (this.wss) {
      this.wss.close(() => Logger.debug('WebSocket server closed.'));
    }
    if (this.server) {
      this.server.close(() => Logger.debug('HTTP server closed.'));
    }
    if (this.ngrokListener) {
      this.ngrokListener
        .close()
        .then(() => Logger.debug('ngrok connection closed.'));
    }
  }

  private setupHttpServer() {
    this.server = http.createServer(
      (req: http.IncomingMessage, res: http.ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('Congrats you have created an ngrok web server');
      },
    );

    this.server.on('error', (error) => {
      Logger.error('HTTP server error:', error);
    });
  }

  private setupWebSocketServer() {
    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws: WebSocket) => {
      Logger.debug('Client connected');

      ws.on('message', (message: WebSocket.Data) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        Logger.debug('Client disconnected');
        this.removeWebSocketFromMaps(ws);
      });

      ws.on('error', (error) => {
        Logger.error('WebSocket error:', error);
      });
    });

    this.wss.on('error', (error) => {
      Logger.error('WebSocket server error:', error);
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocket.Data) {
    Logger.debug('Received message:', message);
    try {
      const jsonMessage: SocketMessageModel = JSON.parse(message.toString());
      switch (jsonMessage.event) {
        case SocketEventEnum.PresentApplicationId:
          this.handlePresentApplicationId(ws, jsonMessage);
          break;
        case SocketEventEnum.PresentRemoveApplicationId:
          this.handlePresentRemoveApplicationId(jsonMessage);
          break;
        default:
          this.forwardMessage(jsonMessage, message);
          break;
      }
    } catch (error) {
      Logger.error('Failed to process message:', error);
    }
  }

  private handlePresentApplicationId(
    ws: WebSocket,
    message: SocketMessageModel,
  ) {
    const userApplicationId = message.message.join('');
    Logger.debug(`Setting application ID ${userApplicationId}`);
    this.users.set(userApplicationId, ws);
  }

  private handlePresentRemoveApplicationId(message: SocketMessageModel) {
    const userApplicationId = message.message.join('');
    Logger.debug(`Removing application ID ${userApplicationId}`);
    this.users.delete(userApplicationId);
  }

  private forwardMessage(
    jsonMessage: SocketMessageModel,
    rawMessage: WebSocket.Data,
  ) {
    const receiverId = this.users.get(jsonMessage.callId);
    if (receiverId) {
      receiverId.send(rawMessage);
    } else {
      Logger.debug('User not exist');
    }
  }
  private removeWebSocketFromMaps(ws: WebSocket) {
    for (const [key, value] of this.users.entries()) {
      if (value === ws) {
        this.users.delete(key);
        Logger.debug(`Cleaning up WebSocket resources for ${key}`);
      }
    }
  }

  checkUserIsOnline(ids: string[]): UserStatusResDto[] {
    Logger.debug('Checking user statuses for IDs:', ids);
    return ids.map((id) => ({
      id,
      status: this.users.has(id),
    }));
  }
}
