import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { UserStatus } from './dto/user_status.dto';
import { CheckOnlineStatusDto } from './dto/user_status_req.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('check-online-status')
  @ApiTags('User')
  @ApiOperation({ summary: 'Check if users are online' })
  @ApiQuery({ name: 'ids', type: [String], description: 'Array of user IDs', required: true })
  @ApiResponse({ status: 200, description: 'Array of user statuses', type: [UserStatus] })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async CheckUserIsOnline(@Query() query: CheckOnlineStatusDto): Promise<UserStatus[]> {
    const { ids } = query;
    return this.appService.CheckUserIsOnline(ids);
  }
}
