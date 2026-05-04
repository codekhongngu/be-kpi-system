import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateReportPeriodDto } from './create-report-period.dto';

export class UpdateReportPeriodDto extends PartialType(
  OmitType(CreateReportPeriodDto, ['code'] as const),
) {}
