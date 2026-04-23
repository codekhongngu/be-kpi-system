import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportSummary } from './entities/report-summary.entity';
import { SummaryService } from './summary.service';
import { SummaryController } from './summary.controller';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReportSummary, Role, Permission])],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
