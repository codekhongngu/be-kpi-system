import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../common';
import { ImportJobService } from './import-job.service';
import { ImportJobQueryDto } from './dto/import-job-query.dto';

@Controller('import-jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportJobController {
  constructor(private readonly importJobService: ImportJobService) {}

  @Get()
  @Permissions('import-jobs.read')
  async findAll(@Query() query: ImportJobQueryDto) {
    return await this.importJobService.findAll(query);
  }

  @Get(':id')
  @Permissions('import-jobs.read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.importJobService.findOne(id);
  }
}
