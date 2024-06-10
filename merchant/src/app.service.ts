import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  start(): string {
    return 'Service started';
  }
}
