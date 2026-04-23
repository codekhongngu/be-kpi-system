import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportSummary } from './entities/report-summary.entity';
import { SummaryService } from './summary.service';
import { SummaryController } from './summary.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';
import { RoleGroup } from '../user/entities/role-group.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReportSummary, RoleGroup, UserRoleGroup])],
  controllers: [SummaryController],
  providers: [SummaryService, QldlRbacGuard],
})
export class SummaryModule {}
