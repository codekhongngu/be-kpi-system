import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { QldlRbacGuard } from '../../common/guards/qldl-rbac.guard';
import { RoleGroup } from '../user/entities/role-group.entity';
import { UserRoleGroup } from '../user/entities/user-role-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, RoleGroup, UserRoleGroup])],
  controllers: [NotificationController],
  providers: [NotificationService, QldlRbacGuard],
})
export class NotificationModule {}
