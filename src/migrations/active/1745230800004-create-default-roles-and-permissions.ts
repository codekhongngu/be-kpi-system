import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDefaultRolesAndPermissions1745230800004 implements MigrationInterface {
  name = 'CreateDefaultRolesAndPermissions1745230800004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create permissions
    const permissions = [
      ['users.manage', 'Quản lý tài khoản', 'CRUD tài khoản + reset password + trạng thái', 'admin'],
      ['users.export', 'Import/Export tài khoản', 'Import/Export người dùng', 'admin'],
      ['roles.manage', 'Quản lý vai trò & phân quyền', 'Quản trị roles/permissions', 'admin'],
      ['audit.read', 'Xem nhật ký kiểm toán', 'Tra cứu audit logs', 'admin'],
      ['orgs.manage', 'Quản lý đơn vị hành chính', 'CRUD + lock/unlock', 'qldl'],
      ['periods.manage', 'Quản lý kỳ báo cáo', 'CRUD kỳ báo cáo', 'qldl'],
      ['forms.manage', 'Thiết kế biểu mẫu', 'Forms + attributes + indicators', 'qldl'],
      ['field-categories.manage', 'Quản lý danh mục trường', 'CRUD danh mục trường biểu mẫu', 'qldl'],
      ['assignments.manage', 'Giao / hủy giao báo cáo', 'Quản trị assignments', 'qldl'],
      ['submissions.manage', 'Nhập liệu / gửi báo cáo', 'Tạo submission + lưu cells + submit', 'qldl'],
      ['approvals.manage', 'Duyệt báo cáo', 'Approve/Reject', 'qldl'],
      ['approvals.department.manage', 'Duyệt báo cáo cấp phòng ban', 'Duyệt/từ chối báo cáo cấp phòng ban', 'qldl'],
      ['approvals.district.manage', 'Duyệt báo cáo cấp xã', 'Duyệt/từ chối báo cáo cấp xã', 'qldl'],
      ['summaries.manage', 'Tổng hợp báo cáo', 'Summaries + recompute', 'qldl'],
      ['analytics.read', 'Xem phân tích / KPI', 'Dashboard/analytics read', 'qldl'],
      ['analytics.export', 'Xuất dữ liệu phân tích / KPI', 'Export analytics', 'qldl'],
      ['monitoring.read', 'Xem giám sát/nhắc hạn', 'Xem monitoring reports', 'qldl'],
      ['monitoring.manage', 'Gửi nhắc hạn/điều hành', 'Gửi reminders', 'qldl'],
      ['notifications.read', 'Xem thông báo', 'Inbox notifications', 'qldl'],
      ['reports.read', 'Tra cứu báo cáo', 'Query reports', 'qldl'],
      ['reports.export', 'Xuất báo cáo tra cứu', 'Export reports', 'qldl'],
      ['dashboard.read', 'Xem dashboard', 'Dashboard overview/trends', 'qldl'],
      ['files.upload', 'Tải file', 'Upload file', 'admin'],
      ['files.read', 'Xem file', 'Get/list file', 'admin'],
      ['files.delete', 'Xóa file', 'Delete file', 'admin'],
      ['import-jobs.read', 'Xem trạng thái import', 'Tra cứu tiến trình import', 'admin'],
      ['campaigns.manage', 'Quản lý chiến dịch báo cáo', 'CRUD + dispatch + cancel + close campaigns', 'qldl'],
      ['campaigns.dispatch', 'Gửi chiến dịch báo cáo', 'Xác nhận gửi chiến dịch', 'qldl'],
    ];

    for (const [code, name, description, category] of permissions) {
      await queryRunner.query(
        `
        INSERT INTO "permissions" ("code", "name", "description", "category", "created_at", "updated_at")
        VALUES ($1, $2, $3, $4, now(), now())
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "category" = EXCLUDED."category",
          "updated_at" = now()
        `,
        [code, name, description, category],
      );
    }

    // Create roles
    const roles = [
      ['SYSTEM_ADMIN', 'System Admin', 'Toàn quyền cấu hình & vận hành', true],
      ['DATA_MANAGER', 'Data Manager', 'Quản lý kỳ/biểu mẫu/giao việc/tổng hợp/giám sát', false],
      ['DATA_ENTRY', 'Data Entry', 'Nhập liệu & nộp báo cáo', false],
      ['APPROVER', 'Approver', 'Duyệt / từ chối báo cáo', false],
    ];

    for (const [code, name, description, isSystem] of roles) {
      await queryRunner.query(
        `
        INSERT INTO "roles" ("code", "name", "description", "is_system", "created_at", "updated_at")
        VALUES ($1, $2, $3, $4, now(), now())
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "is_system" = EXCLUDED."is_system",
          "updated_at" = now()
        `,
        [code, name, description, isSystem],
      );
    }

    // Assign permissions to roles
    const rolePermissions = {
      'SYSTEM_ADMIN': [
        'users.manage', 'users.export', 'roles.manage', 'audit.read', 'orgs.manage',
        'periods.manage', 'forms.manage', 'field-categories.manage', 'assignments.manage', 'submissions.manage',
        'approvals.manage', 'approvals.department.manage', 'approvals.district.manage',
        'summaries.manage', 'analytics.read', 'analytics.export', 'monitoring.read',
        'monitoring.manage', 'notifications.read', 'reports.read', 'reports.export',
        'dashboard.read', 'files.upload', 'files.read', 'files.delete', 'import-jobs.read'
      ],
      'DATA_MANAGER': [
        'periods.manage', 'forms.manage', 'assignments.manage', 'campaigns.manage', 'campaigns.dispatch',
        'summaries.manage', 'analytics.read', 'analytics.export', 'monitoring.read', 'monitoring.manage',
        'notifications.read', 'reports.read', 'reports.export', 'dashboard.read'
      ],
      'DATA_ENTRY': [
        'submissions.manage', 'notifications.read', 'reports.read', 'reports.export'
      ],
      'APPROVER': [
        'approvals.manage', 'approvals.department.manage', 'approvals.district.manage',
        'notifications.read', 'reports.read', 'reports.export'
      ],
    };

    for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
      await queryRunner.query(
        `
        INSERT INTO "role_permissions" ("role_id", "permission_id")
        SELECT r."id", p."id"
        FROM "roles" r
        CROSS JOIN "permissions" p
        WHERE r."code" = $1 AND p."code" = ANY($2)
        ON CONFLICT ("role_id", "permission_id") DO NOTHING
        `,
        [roleCode, permissionCodes],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role_permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "role_id" IN (
        SELECT "id" FROM "roles" WHERE "code" IN ('SYSTEM_ADMIN', 'DATA_MANAGER', 'DATA_ENTRY', 'APPROVER')
      )
    `);

    // Remove roles
    await queryRunner.query(`
      DELETE FROM "roles" WHERE "code" IN ('SYSTEM_ADMIN', 'DATA_MANAGER', 'DATA_ENTRY', 'APPROVER')
    `);

    // Remove permissions
    await queryRunner.query(`
      DELETE FROM "permissions" WHERE "code" IN (
        'users.manage', 'users.export', 'roles.manage', 'audit.read', 'orgs.manage',
        'periods.manage', 'forms.manage', 'assignments.manage', 'submissions.manage',
        'approvals.manage', 'approvals.department.manage', 'approvals.district.manage',
        'summaries.manage', 'analytics.read', 'analytics.export', 'monitoring.read',
        'monitoring.manage', 'notifications.read', 'reports.read', 'reports.export',
        'dashboard.read', 'files.upload', 'files.read', 'files.delete', 'import-jobs.read',
        'campaigns.manage', 'campaigns.dispatch', 'field-categories.manage'
      )
    `);
  }
}