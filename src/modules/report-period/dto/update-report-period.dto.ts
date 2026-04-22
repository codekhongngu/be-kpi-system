import { PartialType } from '@nestjs/swagger';
import { CreateReportPeriodDto } from './create-report-period.dto';

export class UpdateReportPeriodDto extends PartialType(CreateReportPeriodDto) {}

