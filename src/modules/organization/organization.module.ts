import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { User } from '../user/entities/user.entity';
import { RoleGroup } from '../user/entities/role-group.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, User, RoleGroup, UserRoleGroup]),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService, QldlRbacGuard],
  exports: [OrganizationService],
})
export class OrganizationModule {}

