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
      {
        code: 'users.manage',
        name: 'Quản lý tài khoản',
        description: 'CRUD tài khoản + reset password + trạng thái',
        category: 'admin',
      },
      {
        code: 'users.export',
        name: 'Import/Export tài khoản',
        description: 'Import/Export người dùng',
        category: 'admin',
      },
      {
        code: 'roles.manage',
        name: 'Quản lý vai trò & phân quyền',
        description: 'Quản trị roles/permissions',
        category: 'admin',
      },
      {
        code: 'audit.read',
        name: 'Xem nhật ký kiểm toán',
        description: 'Tra cứu audit logs',
        category: 'admin',
      },
      {
        code: 'orgs.manage',
        name: 'Quản lý đơn vị hành chính',
        description: 'CRUD + lock/unlock',
        category: 'QLDL',
      },
      {
        code: 'periods.manage',
        name: 'Quản lý kỳ báo cáo',
        description: 'CRUD kỳ báo cáo',
        category: 'QLDL',
      },
      {
        code: 'forms.manage',
        name: 'Thiết kế biểu mẫu',
        description: 'Field categories + forms + attributes + indicators',
        category: 'QLDL',
      },
      {
        code: 'assignments.manage',
        name: 'Giao / hủy giao báo cáo',
        description: 'Quản trị assignments',
        category: 'QLDL',
      },
      {
        code: 'submissions.manage',
        name: 'Nhập liệu / gửi báo cáo',
        description: 'Tạo submission + lưu cells + submit',
        category: 'QLDL',
      },
      {
        code: 'approvals.manage',
        name: 'Duyệt báo cáo',
        description: 'Approve/Reject',
        category: 'QLDL',
      },
      {
        code: 'summaries.manage',
        name: 'Tổng hợp báo cáo',
        description: 'Summaries + recompute',
        category: 'QLDL',
      },
      {
        code: 'monitoring.read',
        name: 'Xem giám sát/nhắc hạn',
        description: 'Xem monitoring reports',
        category: 'QLDL',
      },
      {
        code: 'monitoring.manage',
        name: 'Gửi nhắc hạn/điều hành',
        description: 'Gửi reminders',
        category: 'QLDL',
      },
      {
        code: 'reports.read',
        name: 'Tra cứu báo cáo',
        description: 'Query reports',
        category: 'QLDL',
      },
      {
        code: 'reports.export',
        name: 'Xuất báo cáo tra cứu',
        description: 'Export reports',
        category: 'QLDL',
      },
      {
        code: 'analytics.read',
        name: 'Xem phân tích / KPI',
        description: 'Dashboard/analytics read',
        category: 'QLDL',
      },
      {
        code: 'analytics.export',
        name: 'Xuất dữ liệu phân tích / KPI',
        description: 'Export analytics',
        category: 'QLDL',
      },
      {
        code: 'notifications.read',
        name: 'Xem thông báo',
        description: 'Inbox notifications',
        category: 'QLDL',
      },
      {
        code: 'dashboard.read',
        name: 'Xem dashboard',
        description: 'Dashboard overview/trends',
        category: 'QLDL',
      },
      {
        code: 'files.upload',
        name: 'Tải file',
        description: 'Upload file',
        category: 'admin',
      },
      {
        code: 'files.read',
        name: 'Xem file',
        description: 'Get/list file',
        category: 'admin',
      },
      {
        code: 'files.delete',
        name: 'Xóa file',
        description: 'Delete file',
        category: 'admin',
      },
      {
        code: 'import-jobs.read',
        name: 'Xem trạng thái import',
        description: 'Tra cứu tiến trình import',
        category: 'admin',
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
        code: 'SYSTEM_ADMIN',
        name: 'System Admin',
        description: 'Toàn quyền cấu hình & vận hành',
        isSystem: true,
        permissionCodes: [
          'users.manage',
          'users.export',
          'roles.manage',
          'audit.read',
          'orgs.manage',
          'periods.manage',
          'forms.manage',
          'assignments.manage',
          'submissions.manage',
          'approvals.manage',
          'summaries.manage',
          'analytics.read',
          'analytics.export',
          'monitoring.read',
          'monitoring.manage',
          'notifications.read',
          'reports.read',
          'reports.export',
          'dashboard.read',
          'files.upload',
          'files.read',
          'files.delete',
          'import-jobs.read',
        ],
      },
      {
        code: 'DATA_MANAGER',
        name: 'Data Manager',
        description: 'Quản lý kỳ/biểu mẫu/giao việc/tổng hợp/giám sát',
        isSystem: false,
        permissionCodes: [
          'periods.manage',
          'forms.manage',
          'assignments.manage',
          'summaries.manage',
          'analytics.read',
          'analytics.export',
          'monitoring.read',
          'monitoring.manage',
          'notifications.read',
          'reports.read',
          'reports.export',
          'dashboard.read',
        ],
      },
      {
        code: 'DATA_ENTRY',
        name: 'Data Entry',
        description: 'Nhập liệu & nộp báo cáo',
        isSystem: false,
        permissionCodes: [
          'submissions.manage',
          'notifications.read',
          'reports.read',
          'reports.export',
        ],
      },
      {
        code: 'APPROVER',
        name: 'Approver',
        description: 'Duyệt / từ chối báo cáo',
        isSystem: false,
        permissionCodes: [
          'approvals.manage',
          'notifications.read',
          'reports.read',
          'reports.export',
        ],
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
