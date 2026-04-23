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
import { QldlPermission, QldlRbacGuard } from '../../common';
import { SummaryService } from './summary.service';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { CreateSummaryDto } from './dto/create-summary.dto';

@Controller('summaries')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  @QldlPermission('OPS_SUMMARIES', 'READ')
  async list(@Query() query: SummaryQueryDto) {
    return await this.summaryService.findAll(query);
  }

  @Post()
  @QldlPermission('OPS_SUMMARIES', 'WRITE')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSummaryDto, @CurrentUser() user: User) {
    return await this.summaryService.create(dto, user?.id);
  }

  @Get(':id')
  @QldlPermission('OPS_SUMMARIES', 'READ')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.summaryService.findOne(id);
  }

  @Post(':id/recompute')
  @QldlPermission('OPS_SUMMARIES', 'WRITE')
  async recompute(@Param('id', ParseUUIDPipe) id: string) {
    return await this.summaryService.recompute(id);
  }
}
