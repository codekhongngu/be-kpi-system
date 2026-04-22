import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { Organization } from '../organization/entities/organization.entity';
import { RoleGroup } from './entities/role-group.entity';
import { ImportJob } from './entities/import-job.entity';
import { UserRoleGroup } from './entities/user-role-group.entity';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Organization,
      RoleGroup,
      ImportJob,
      UserRoleGroup,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, QldlRbacGuard],
  exports: [UserService],
})
export class UserModule {}
