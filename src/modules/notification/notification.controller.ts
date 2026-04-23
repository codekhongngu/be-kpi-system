import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { QldlPermission, QldlRbacGuard } from '../../common';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationLogsQueryDto } from './dto/notification-logs-query.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @QldlPermission('NOTIFICATIONS', 'READ')
  async list(@CurrentUser() user: User, @Query() query: NotificationQueryDto) {
    return await this.notificationService.listInbox(
      user.id,
      query.isRead,
      query.page,
      query.limit,
    );
  }

  @Post(':id/read')
  @QldlPermission('NOTIFICATIONS', 'READ')
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.notificationService.markRead(id, user.id);
  }

  @Get('logs')
  @QldlPermission('NOTIFICATIONS', 'READ')
  async logs(@Query() query: NotificationLogsQueryDto) {
    return await this.notificationService.listLogs(query.page, query.limit);
  }
}
