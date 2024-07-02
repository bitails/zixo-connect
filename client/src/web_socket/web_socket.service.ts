import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { AppConfigService } from 'src/app.config.service';
import { AppService } from 'src/app.service';
import { SocketEventEnum } from 'types/event';
import { WebSocketInstance } from 'types/socket/instance';
import { SocketMessagemodel } from 'types/socket/message';
import { WebSocket } from 'ws';

@Injectable()
export class WebSocketService implements OnModuleDestroy {
  private webSockets: Map<string, WebSocketInstance> = new Map();
  private readonly initialReconnectInterval: number = 1000; // Initial reconnect interval in ms
  private readonly maxReconnectInterval: number = 30000; // Max reconnect interval in ms
  private readonly logger = new Logger(WebSocketService.name);

  constructor(
    private appConfigService: AppConfigService,
    @Inject(forwardRef(() => AppService))
    private appService: AppService,
  ) {}

  createWebSocket(wsUrl: string): Promise<WebSocketInstance> {
    return new Promise((resolve, reject) => {
      const webSocket = new WebSocket(wsUrl, {
        perMessageDeflate: false, // Disable permessage-deflate if needed
      });

      const webSocketInstance: WebSocketInstance = {
        webSocket,
        reconnectInterval: this.initialReconnectInterval,
        url: wsUrl, // Store the URL here
      };

      webSocket.onopen = () => {
        this.webSockets.set(wsUrl, webSocketInstance);
        this.setupWebSocketEvents(webSocketInstance);
        resolve(webSocketInstance);
      };

      webSocket.onerror = (error) => {
        reject(error);
      };
    });
  }

  private setupWebSocketEvents(instance: WebSocketInstance) {
    instance.webSocket.on('open', () => {
      this.logger.debug(`WebSocket connection established for ${instance.url}`);
      instance.reconnectInterval = this.initialReconnectInterval; // Reset the reconnect interval on successful connection
    });

    instance.webSocket.on('message', async (message) => {
      this.logger.debug(`Received message from ${instance.url}: ${message}`);
      this.appService.handleInputSocketMessage(
        instance.url,
        JSON.parse(message),
      );
      // Handle the message, knowing which server it came from
    });

    instance.webSocket.on('error', (error) => {
      this.logger.error(`WebSocket error on ${instance.url}: ${error.message}`);
      this.handleReconnect(instance.url);
    });

    instance.webSocket.on('close', () => {
      this.logger.debug(`WebSocket connection closed for ${instance.url}`);
      this.handleReconnect(instance.url);
    });
  }

  private handleReconnect(wsUrl: string) {
    const instance = this.webSockets.get(wsUrl);
    if (instance) {
      if (instance.reconnectInterval <= this.maxReconnectInterval) {
        setTimeout(() => {
          this.logger.debug(
            `Attempting to reconnect ${wsUrl} in ${instance.reconnectInterval}ms`,
          );
          this.createWebSocket(wsUrl);
          instance.reconnectInterval *= 2; // Exponential backoff
        }, instance.reconnectInterval);
      } else {
        this.logger.error(
          `Max reconnect interval reached for ${wsUrl}. Could not reconnect.`,
        );
        this.webSockets.delete(wsUrl);
      }
    }
  }

  public sendMessage(wsUrl: string, message: string) {
    const instance = this.webSockets.get(wsUrl);
    if (instance && instance.webSocket.readyState === WebSocket.OPEN) {
      instance.webSocket.send(message);
    } else {
      this.logger.error(
        `WebSocket is not open for ${wsUrl}. Unable to send message.`,
      );
    }
  }

  onModuleDestroy() {
    this.webSockets.forEach((instance, wsUrl) => {
      const message: string[] = [
        this.appConfigService.APPLICATION_WEB_SOCKET_CALL_ID,
      ];
      const socketMessage: SocketMessagemodel = {
        id: -1,
        event: SocketEventEnum.PresentRemoveApplicationId,
        callId: '',
        message: message,
      };

      this.sendMessage(wsUrl, JSON.stringify(socketMessage));
      instance.webSocket.close();
    });
  }
}
