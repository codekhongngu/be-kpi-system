import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { RoleSeederService } from './services/role-seeder.service';
import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [RoleController, PermissionController],
  providers: [RoleService, PermissionService, RoleSeederService],
  exports: [RoleService, PermissionService],
})
export class RoleModule {}
