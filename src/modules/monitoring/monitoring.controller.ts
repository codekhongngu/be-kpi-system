import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { QldlPermission, QldlRbacGuard } from '../../common';
import { MonitoringService } from './monitoring.service';
import { MonitoringQueryDto } from './dto/monitoring-query.dto';
import { SendRemindersDto } from './dto/send-reminders.dto';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('reports')
  @QldlPermission('OPS_MONITORING', 'READ')
  async reports(
    @CurrentUser() user: User,
    @Query() query: MonitoringQueryDto,
  ) {
    return await this.monitoringService.listReports(user, query);
  }

  @Post('reminders')
  @QldlPermission('OPS_MONITORING', 'WRITE')
  async reminders(@Body() dto: SendRemindersDto) {
    return await this.monitoringService.sendReminders(dto);
  }
}
