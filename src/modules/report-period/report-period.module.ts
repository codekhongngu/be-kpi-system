import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportPeriod } from './entities/report-period.entity';
import { ReportPeriodService } from './report-period.service';
import { ReportPeriodController } from './report-period.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReportPeriod])],
  controllers: [ReportPeriodController],
  providers: [ReportPeriodService],
  exports: [ReportPeriodService],
})
export class ReportPeriodModule {}

