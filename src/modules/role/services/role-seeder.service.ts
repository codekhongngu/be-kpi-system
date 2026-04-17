import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class RoleSeederService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async onModuleInit() {
    // Chỉ chạy seeder trong môi trường development hoặc khi cần
    if (process.env.RUN_SEEDER === 'true') {
      await this.seed();
    }
  }

  async seed() {
    console.log('Starting Role & Permission seeding...');

    // Tạo Permissions
    const permissions = await this.createPermissions();

    // Tạo Roles
    await this.createRoles(permissions);

    console.log('Role & Permission seeding completed!');
  }

  private async createPermissions(): Promise<Permission[]> {
    const permissionData = [
      // User Management Permissions
      {
        code: 'users.create',
        name: 'Tạo người dùng',
        description: 'Quyền tạo người dùng mới',
        category: 'users',
      },
      {
        code: 'users.read',
        name: 'Xem người dùng',
        description: 'Quyền xem danh sách và chi tiết người dùng',
        category: 'users',
      },
      {
        code: 'users.update',
        name: 'Cập nhật người dùng',
        description: 'Quyền cập nhật thông tin người dùng',
        category: 'users',
      },
      {
        code: 'users.delete',
        name: 'Xóa người dùng',
        description: 'Quyền xóa người dùng',
        category: 'users',
      },
      // Role Management Permissions
      {
        code: 'roles.create',
        name: 'Tạo vai trò',
        description: 'Quyền tạo vai trò mới',
        category: 'roles',
      },
      {
        code: 'roles.read',
        name: 'Xem vai trò',
        description: 'Quyền xem danh sách và chi tiết vai trò',
        category: 'roles',
      },
      {
        code: 'roles.update',
        name: 'Cập nhật vai trò',
        description: 'Quyền cập nhật thông tin vai trò',
        category: 'roles',
      },
      {
        code: 'roles.delete',
        name: 'Xóa vai trò',
        description: 'Quyền xóa vai trò',
        category: 'roles',
      },
      {
        code: 'roles.assign',
        name: 'Gán vai trò',
        description: 'Quyền gán vai trò cho người dùng',
        category: 'roles',
      },
      // Permission Management Permissions
      {
        code: 'permissions.create',
        name: 'Tạo quyền',
        description: 'Quyền tạo quyền mới',
        category: 'permissions',
      },
      {
        code: 'permissions.read',
        name: 'Xem quyền',
        description: 'Quyền xem danh sách và chi tiết quyền',
        category: 'permissions',
      },
      {
        code: 'permissions.update',
        name: 'Cập nhật quyền',
        description: 'Quyền cập nhật thông tin quyền',
        category: 'permissions',
      },
      {
        code: 'permissions.delete',
        name: 'Xóa quyền',
        description: 'Quyền xóa quyền',
        category: 'permissions',
      },
      // Reporting Permissions
      {
        code: 'reports.create',
        name: 'Tạo báo cáo',
        description: 'Quyền tạo báo cáo mới',
        category: 'reports',
      },
      {
        code: 'reports.read',
        name: 'Xem báo cáo',
        description: 'Quyền xem danh sách và chi tiết báo cáo',
        category: 'reports',
      },
      {
        code: 'reports.update',
        name: 'Cập nhật báo cáo',
        description: 'Quyền cập nhật báo cáo',
        category: 'reports',
      },
      {
        code: 'reports.delete',
        name: 'Xóa báo cáo',
        description: 'Quyền xóa báo cáo',
        category: 'reports',
      },
      {
        code: 'reports.approve',
        name: 'Phê duyệt báo cáo',
        description: 'Quyền phê duyệt báo cáo',
        category: 'reports',
      },
      {
        code: 'reports.submit',
        name: 'Nộp báo cáo',
        description: 'Quyền nộp báo cáo',
        category: 'reports',
      },
      // Dashboard Permissions
      {
        code: 'dashboard.view',
        name: 'Xem dashboard',
        description: 'Quyền xem dashboard thống kê',
        category: 'dashboard',
      },
    ];

    const permissions: Permission[] = [];

    for (const data of permissionData) {
      let permission = await this.permissionRepository.findOne({
        where: { code: data.code },
      });

      if (!permission) {
        permission = this.permissionRepository.create(data);
        permission = await this.permissionRepository.save(permission);
        console.log(`Created permission: ${data.code}`);
      } else {
        console.log(`Permission already exists: ${data.code}`);
      }

      permissions.push(permission);
    }

    return permissions;
  }

  private async createRoles(permissions: Permission[]) {
    const roleData = [
      {
        code: 'admin',
        name: 'Quản trị viên',
        description: 'Quyền quản trị hệ thống, có tất cả quyền',
        isSystem: true,
        permissionCodes: [
          'users.create',
          'users.read',
          'users.update',
          'users.delete',
          'roles.create',
          'roles.read',
          'roles.update',
          'roles.delete',
          'roles.assign',
          'permissions.create',
          'permissions.read',
          'permissions.update',
          'permissions.delete',
          'reports.create',
          'reports.read',
          'reports.update',
          'reports.delete',
          'reports.approve',
          'reports.submit',
          'dashboard.view',
        ],
      },
      {
        code: 'manager',
        name: 'Quản lý',
        description: 'Quyền quản lý, có thể xem và phê duyệt báo cáo',
        isSystem: true,
        permissionCodes: [
          'users.read',
          'reports.read',
          'reports.update',
          'reports.approve',
          'reports.submit',
          'dashboard.view',
        ],
      },
      {
        code: 'guest',
        name: 'Khách',
        description: 'Quyền khách, chỉ có thể xem và nộp báo cáo',
        isSystem: true,
        permissionCodes: ['reports.read', 'reports.submit'],
      },
    ];

    for (const data of roleData) {
      let role = await this.roleRepository.findOne({
        where: { code: data.code },
        relations: ['permissions'],
      });

      if (!role) {
        role = this.roleRepository.create({
          code: data.code,
          name: data.name,
          description: data.description,
          isSystem: data.isSystem,
        });
        role = await this.roleRepository.save(role);
        console.log(`Created role: ${data.code}`);
      } else {
        console.log(`Role already exists: ${data.code}`);
      }

      // Gán permissions cho role
      const rolePermissions = permissions.filter((p) =>
        data.permissionCodes.includes(p.code),
      );
      role.permissions = rolePermissions;
      await this.roleRepository.save(role);
      console.log(
        `Assigned ${rolePermissions.length} permissions to role: ${data.code}`,
      );
    }
  }
}
