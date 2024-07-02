import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { CheckOnlineStatusDto, UserStatusResDto } from './dto/user/status.dto';

@ApiTags('User')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('check-online-status')
  @ApiOperation({ summary: 'Check if users are online' })
  @ApiQuery({
    name: 'ids',
    type: [String],
    description: 'Array of user IDs',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Array of user statuses',
    type: [UserStatusResDto],
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async checkUserIsOnline(
    @Query() query: CheckOnlineStatusDto,
  ): Promise<UserStatusResDto[]> {
    const { ids } = query;
    return this.appService.checkUserIsOnline(ids);
  }
}
