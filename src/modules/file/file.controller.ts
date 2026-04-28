import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../common';
import { FileService } from './file.service';
import { FileQueryDto } from './dto/file-query.dto';
import { FileCategory } from './entities/file-record.entity';
import { createReadStream } from 'fs';
import * as path from 'path';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @Permissions('files.upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: UploadedFile,
    @Body('category') category: FileCategory,
    @Body('isPublic') isPublic?: string,
  ) {
    return await this.fileService.upload(
      file,
      category,
      null,
      { isPublic: isPublic === 'true' },
    );
  }

  @Get()
  @Permissions('files.read')
  async findAll(@Query() query: FileQueryDto) {
    return await this.fileService.findAll(query);
  }

  @Get(':id')
  @Permissions('files.read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.fileService.findOne(id);
  }

  @Get(':id/download')
  @Permissions('files.read')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { record, path: filePath } = await this.fileService.getFilePath(id);
    res.set({
      'Content-Type': record.mimeType,
      'Content-Disposition': `attachment; filename="${record.originalName}"`,
    });
    const file = createReadStream(filePath);
    return new StreamableFile(file);
  }

  @Delete(':id')
  @Permissions('files.delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.fileService.delete(id);
  }
}
