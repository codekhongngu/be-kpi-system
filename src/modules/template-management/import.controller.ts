import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../common';
import { TemplateManagementService } from './form-designer.service';
import { ImportIndicatorsAttributesDto } from './dto/import-indicators-attributes.dto';

@Controller('forms/:templateId/import')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportController {
  constructor(private readonly formDesigner: TemplateManagementService) {}

  @Post('indicators-attributes')
  @Permissions('forms.manage')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async importIndicatorsAttributes(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('File không được để trống');
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException('Chỉ chấp nhận file Excel (.xlsx, .xls)');
    }

    return await this.formDesigner.importIndicatorsFromExcel(templateId, file.buffer);
  }

  @Post('excel')
  @Permissions('forms.manage')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file Excel');
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException('Chỉ chấp nhận file Excel (.xlsx, .xls)');
    }

    return await this.formDesigner.importIndicatorsFromExcel(templateId, file.buffer);
  }
}
