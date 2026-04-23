import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../role/entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Role, Permission])],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
