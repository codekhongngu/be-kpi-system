import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportSummary } from './entities/report-summary.entity';
import { SummaryService } from './summary.service';
import { SummaryController } from './summary.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ReportSummary])],
  controllers: [SummaryController],
  providers: [SummaryService, QldlRbacGuard],
})
export class SummaryModule {}
