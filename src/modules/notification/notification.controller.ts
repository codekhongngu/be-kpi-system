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
import { Permissions, PermissionsGuard } from '../../common';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationLogsQueryDto } from './dto/notification-logs-query.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Permissions('notifications.read')
  async list(@CurrentUser() user: User, @Query() query: NotificationQueryDto) {
    return await this.notificationService.listInbox(
      user.id,
      query.isRead,
      query.page,
      query.limit,
    );
  }

  @Post(':id/read')
  @Permissions('notifications.read')
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.notificationService.markRead(id, user.id);
  }

  @Get('logs')
  @Permissions('notifications.read')
  async logs(@Query() query: NotificationLogsQueryDto) {
    return await this.notificationService.listLogs(query.page, query.limit);
  }
}
