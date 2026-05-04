import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Permissions, PermissionsGuard } from '../../common';
import { FormDesignerService } from './form-designer.service';
import { FormQueryDto } from './dto/form-query.dto';
import { CreateFormDto } from './dto/create-form.dto';
import { PatchFormDto } from './dto/patch-form.dto';
import { CopyFormDto } from './dto/copy-form.dto';

@Controller('forms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FormsController {
  constructor(private readonly formDesigner: FormDesignerService) {}

  @Get()
  @Permissions('forms.manage')
  async list(@Query() query: FormQueryDto) {
    return await this.formDesigner.findAllForms(query);
  }

  @Post()
  @Permissions('forms.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateFormDto, @CurrentUser() user: User) {
    return await this.formDesigner.createForm(dto, user?.id);
  }

  @Get(':id')
  @Permissions('forms.manage')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return await this.formDesigner.findOneForm(id);
  }

  @Patch(':id')
  @Permissions('forms.manage')
  async patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchFormDto,
  ) {
    return await this.formDesigner.patchForm(id, dto);
  }

  @Delete(':id')
  @Permissions('forms.manage')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.formDesigner.removeForm(id);
  }

  @Post(':id/activate')
  @Permissions('forms.manage')
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return await this.formDesigner.setActive(id, true);
  }

  @Post(':id/deactivate')
  @Permissions('forms.manage')
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return await this.formDesigner.setActive(id, false);
  }

  @Post(':id/copy')
  @Permissions('forms.manage')
  @HttpCode(HttpStatus.CREATED)
  async copy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CopyFormDto,
    @CurrentUser() user: User,
  ) {
    return await this.formDesigner.copyForm(id, dto, user?.id);
  }

  @Post(':id/template')
  @Permissions('forms.manage')
  @UseInterceptors(FileInterceptor('file'))
  async template(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { originalname: string } | undefined,
  ) {
    if (!file?.originalname) {
      return await this.formDesigner.setTemplateFile(id, 'upload.bin');
    }
    return await this.formDesigner.setTemplateFile(id, file.originalname);
  }
}
