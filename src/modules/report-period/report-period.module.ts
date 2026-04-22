import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportPeriod } from './entities/report-period.entity';
import { ReportPeriodService } from './report-period.service';
import { ReportPeriodController } from './report-period.controller';
import { RoleGroup } from '../user/entities/role-group.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ReportPeriod, RoleGroup, UserRoleGroup])],
  controllers: [ReportPeriodController],
  providers: [ReportPeriodService, QldlRbacGuard],
  exports: [ReportPeriodService],
})
export class ReportPeriodModule {}

