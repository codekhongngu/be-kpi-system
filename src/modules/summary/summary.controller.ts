import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { SummaryService } from './summary.service';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { CreateSummaryDto } from './dto/create-summary.dto';

@Controller('summaries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  @Permissions('summaries.manage')
  async list(@Query() query: SummaryQueryDto) {
    return await this.summaryService.findAll(query);
  }

  @Post()
  @Permissions('summaries.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSummaryDto, @CurrentUser() user: User) {
    return await this.summaryService.create(dto, user?.id);
  }

  @Get(':id')
  @Permissions('summaries.manage')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.summaryService.findOne(id);
  }

  @Post(':id/recompute')
  @Permissions('summaries.manage')
  async recompute(@Param('id', ParseUUIDPipe) id: string) {
    return await this.summaryService.recompute(id);
  }
}
