import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { CreateReportPeriodDto } from './dto/create-report-period.dto';
import { UpdateReportPeriodDto } from './dto/update-report-period.dto';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { ReportPeriodService } from './report-period.service';

@Controller('report-periods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportPeriodController {
  constructor(private readonly service: ReportPeriodService) {}

  @Get()
  @Permissions('periods.manage')
  async list(@Query() query: ReportPeriodQueryDto) {
    return await this.service.findAll(query);
  }

  @Post()
  @Permissions('periods.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateReportPeriodDto,
  ) {
    return await this.service.create(dto, user?.id ?? null);
  }

  @Get(':id')
  @Permissions('periods.manage')
  async detail(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Patch(':id')
  @Permissions('periods.manage')
  async patch(@Param('id') id: string, @Body() dto: UpdateReportPeriodDto) {
    return await this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('periods.manage')
  async remove(@Param('id') id: string) {
    return await this.service.remove(id);
  }
}

