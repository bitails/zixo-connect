import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as ngrok from '@ngrok/ngrok';
import * as http from 'http';
import * as WebSocket from 'ws';
import { AppConfigService } from './app.config.service';
import { SocketEventEnum } from './dto/socket_event.dto';
import { SocketMessagemodel } from './dto/socket_message.dto';
import { UserStatus } from './dto/user_status.dto';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {

  constructor(private appConfigService: AppConfigService) { }
  private server: http.Server;
  private wss: WebSocket.Server;
  private ngrokListener: ngrok.Listener;

  private users = new Map();

  async onModuleInit() {
    this.setupHttpServer();
    this.setupWebSocketServer();

    this.server.listen(this.appConfigService.APPLICATION_SOCKET_PORT, () => Logger.debug(`Node.js web server at ${this.appConfigService.APPLICATION_SOCKET_PORT} is running...`));

    try {
      this.ngrokListener = await ngrok.connect({ addr: this.appConfigService.APPLICATION_SOCKET_PORT, authtoken: this.appConfigService.NGROK_Token });
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
      this.ngrokListener.close().then(() => Logger.debug('ngrok connection closed.'));
    }
  }

  private setupHttpServer() {
    this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('Congrats you have created an ngrok web server');
    });

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
    // Implement your message handling logic here
    Logger.debug('Received message:', message);
    const jsonMessage: SocketMessagemodel = JSON.parse(message);
    // Logger.debug('Received message Parse json:', jsonMessage);
    if (jsonMessage.event === SocketEventEnum.PresentApplicationId) {
      const userApplicationId: string = jsonMessage.message.join('');
      Logger.debug(`set application Id ${userApplicationId}`);
      this.users.set(userApplicationId, ws);
    } else
      if (jsonMessage.event === SocketEventEnum.PresentRemoveApplicationId) {
        const userApplicationId: string = jsonMessage.message.join('');
        Logger.debug(`set application Id ${userApplicationId}`);
        this.users.delete(userApplicationId);
      }
      else {
        if (this.users.has(jsonMessage.callId)) {
          const reciverId: WebSocket = this.users.get(jsonMessage.callId);
          reciverId.send(message);
        } else {
          Logger.debug("user not exist");
        }
      }

  }

  private removeWebSocketFromMaps(ws: WebSocket) {
    // Implement your WebSocket cleanup logic here

    this.users.forEach((value, key) => {
      if (value === ws) {
        this.users.delete(key);
        Logger.debug('Cleaning up WebSocket resources for:');
      }
    });

  }

  CheckUserIsOnline(ids: string[]): UserStatus[] {
    Logger.debug("ids", ids)
    return ids.map(id => ({
      id,
      status: this.users.has(id),
    }));
  }
}
