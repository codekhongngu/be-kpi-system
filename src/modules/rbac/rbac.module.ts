import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleGroup } from '../user/entities/role-group.entity';
import { User } from '../user/entities/user.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';
import { RbacRoleGroupsController } from './role-groups/rbac-role-groups.controller';
import { RbacPermissionsController } from './permissions/rbac-permissions.controller';
import { RbacService } from './rbac.service';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [TypeOrmModule.forFeature([RoleGroup, User, UserRoleGroup])],
  controllers: [RbacRoleGroupsController, RbacPermissionsController],
  providers: [RbacService, QldlRbacGuard],
  exports: [RbacService],
})
export class RbacModule {}
