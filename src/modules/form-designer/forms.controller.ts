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
import { QldlPermission, QldlRbacGuard } from '../../common';
import { FormDesignerService } from './form-designer.service';
import { FormQueryDto } from './dto/form-query.dto';
import { CreateFormDto } from './dto/create-form.dto';
import { PatchFormDto } from './dto/patch-form.dto';
import { CopyFormDto } from './dto/copy-form.dto';

@Controller('forms')
@UseGuards(JwtAuthGuard, QldlRbacGuard)
export class FormsController {
  constructor(private readonly formDesigner: FormDesignerService) {}

  @Get()
  @QldlPermission('DESIGN_FORMS', 'READ')
  async list(@Query() query: FormQueryDto) {
    return await this.formDesigner.findAllForms(query);
  }

  @Post()
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateFormDto, @CurrentUser() user: User) {
    return await this.formDesigner.createForm(dto, user?.id);
  }

  @Get(':id')
  @QldlPermission('DESIGN_FORMS', 'READ')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return await this.formDesigner.findOneForm(id);
  }

  @Patch(':id')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  async patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchFormDto,
  ) {
    return await this.formDesigner.patchForm(id, dto);
  }

  @Delete(':id')
  @QldlPermission('DESIGN_FORMS', 'DELETE')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.formDesigner.removeForm(id);
  }

  @Post(':id/activate')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return await this.formDesigner.setActive(id, true);
  }

  @Post(':id/deactivate')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return await this.formDesigner.setActive(id, false);
  }

  @Post(':id/copy')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
  @HttpCode(HttpStatus.CREATED)
  async copy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CopyFormDto,
    @CurrentUser() user: User,
  ) {
    return await this.formDesigner.copyForm(id, dto, user?.id);
  }

  @Post(':id/template')
  @QldlPermission('DESIGN_FORMS', 'WRITE')
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
