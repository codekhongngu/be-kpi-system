import { MigrationInterface, QueryRunner } from 'typeorm';

/** UUID cố định để seed idempotent + dễ rollback */
const IDS = {
  org: 'f0e0d0c0-b0a0-4a90-8c00-000000000001',
  roleGroup: 'f0e0d0c0-b0a0-4a90-8c00-000000000002',
  nestRole: 'f0e0d0c0-b0a0-4a90-8c00-000000000003',
  adminUser: 'f0e0d0c0-b0a0-4a90-8c00-000000000099',
  periodMonth: 'f0e0d0c0-b0a0-4a90-8c00-000000000010',
  periodQuarter: 'f0e0d0c0-b0a0-4a90-8c00-000000000011',
} as const;

const PERMISSION_IDS = {
  usersManage: 'f0e0d0c0-b0a0-4a90-8c00-000000000021',
  rolesManage: 'f0e0d0c0-b0a0-4a90-8c00-000000000022',
  orgsManage: 'f0e0d0c0-b0a0-4a90-8c00-000000000023',
  periodsManage: 'f0e0d0c0-b0a0-4a90-8c00-000000000024',
  formsManage: 'f0e0d0c0-b0a0-4a90-8c00-000000000025',
  assignmentsManage: 'f0e0d0c0-b0a0-4a90-8c00-000000000026',
  submissionsManage: 'f0e0d0c0-b0a0-4a90-8c00-000000000027',
  approvalsManage: 'f0e0d0c0-b0a0-4a90-8c00-000000000028',
  summariesManage: 'f0e0d0c0-b0a0-4a90-8c00-000000000029',
  analyticsRead: 'f0e0d0c0-b0a0-4a90-8c00-00000000002a',
  auditRead: 'f0e0d0c0-b0a0-4a90-8c00-00000000002b',
} as const;

/**
 * Dữ liệu mẫu:
 * - Tài khoản: username `admin` / mật khẩu `Admin@123` (hash bằng pgcrypto `crypt`, tương thích `bcrypt.compare` ở Nest)
 * - Quyền Nest: bảng `permissions` + `roles` (SUPER_ADMIN) + `role_permissions` + `user_roles`
 * - QLDL (nếu migration schema đã chạy): `role_groups` (JSON permissions), `organizations`, `user_role_groups`, `report_periods`
 *
 * Yêu cầu: migration `1745230800000-QLDL-schema-from-documentation` đã chạy trước (để có `role_groups`, `organizations`, cột QLDL trên `users`, `report_periods`).
 * Bảng `users` phải tồn tại (schema starter / synchronize).
 */
export class SeedSampleAdminRbacAndPeriods1745230800001 implements MigrationInterface {
  name = 'SeedSampleAdminRbacAndPeriods1745230800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(100) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "category" varchar(50) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "UQ_permissions_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "UQ_roles_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id")
      )
    `);

    const permRows: Array<{ id: string; code: string; name: string; category: string }> = [
      { id: PERMISSION_IDS.usersManage, code: 'users.manage', name: 'Quản lý tài khoản', category: 'admin' },
      { id: PERMISSION_IDS.rolesManage, code: 'roles.manage', name: 'Quản lý vai trò & phân quyền', category: 'admin' },
      { id: PERMISSION_IDS.orgsManage, code: 'orgs.manage', name: 'Quản lý đơn vị hành chính', category: 'QLDL' },
      { id: PERMISSION_IDS.periodsManage, code: 'periods.manage', name: 'Quản lý kỳ báo cáo', category: 'QLDL' },
      { id: PERMISSION_IDS.formsManage, code: 'forms.manage', name: 'Thiết kế biểu mẫu', category: 'QLDL' },
      { id: PERMISSION_IDS.assignmentsManage, code: 'assignments.manage', name: 'Giao / hủy giao báo cáo', category: 'QLDL' },
      { id: PERMISSION_IDS.submissionsManage, code: 'submissions.manage', name: 'Nhập liệu / gửi báo cáo', category: 'QLDL' },
      { id: PERMISSION_IDS.approvalsManage, code: 'approvals.manage', name: 'Duyệt báo cáo', category: 'QLDL' },
      { id: PERMISSION_IDS.summariesManage, code: 'summaries.manage', name: 'Tổng hợp báo cáo', category: 'QLDL' },
      { id: PERMISSION_IDS.analyticsRead, code: 'analytics.read', name: 'Xem phân tích / KPI', category: 'QLDL' },
      { id: PERMISSION_IDS.auditRead, code: 'audit.read', name: 'Xem nhật ký kiểm toán', category: 'admin' },
    ];

    for (const p of permRows) {
      await queryRunner.query(
        `
        INSERT INTO "permissions" ("id", "code", "name", "description", "category", "created_at", "updated_at")
        VALUES ($1, $2, $3, $4, $5, now(), now())
        ON CONFLICT ("code") DO NOTHING
      `,
        [p.id, p.code, p.name, null, p.category],
      );
    }

    await queryRunner.query(
      `
      INSERT INTO "roles" ("id", "code", "name", "description", "is_system", "created_at", "updated_at")
      VALUES ($1, 'SUPER_ADMIN', 'Siêu quản trị', 'Toàn quyền cấu hình & vận hành (seed)', true, now(), now())
      ON CONFLICT ("code") DO NOTHING
    `,
      [IDS.nestRole],
    );

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" = 'SUPER_ADMIN'
        AND p."code" IN (
          'users.manage','roles.manage','orgs.manage','periods.manage','forms.manage',
          'assignments.manage','submissions.manage','approvals.manage','summaries.manage',
          'analytics.read','audit.read'
        )
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);

    const QLDLRoleGroupPerms = {
      AUTH: ['READ', 'WRITE', 'DELETE'],
      ADMIN_USERS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      ADMIN_RBAC: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      ADMIN_ORGS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      ADMIN_PERIODS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      DESIGN_FORMS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      OPS_ASSIGNMENTS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      OPS_MONITORING: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      QUERY_REPORTS: ['READ', 'EXPORT'],
      OPS_SUMMARIES: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      ENTRY_SUBMISSIONS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      APPROVALS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
      ANALYTICS: ['READ', 'EXPORT'],
      NOTIFICATIONS: ['READ'],
      AUDIT: ['READ'],
    };

    const hasRoleGroups = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'role_groups'
      ) AS "exists"
    `);
    const hasOrganizations = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
      ) AS "exists"
    `);
    const hasReportPeriods = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'report_periods'
      ) AS "exists"
    `);
    const hasUserRoleGroups = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_role_groups'
      ) AS "exists"
    `);

    if (hasRoleGroups[0]?.exists === true) {
      await queryRunner.query(
        `
        INSERT INTO "role_groups" ("id", "name", "description", "permissions", "is_system", "created_at", "updated_at")
        VALUES ($1, 'Quản trị hệ thống', 'Nhóm QLDL mặc định (seed)', $2::jsonb, true, now(), now())
        ON CONFLICT ("id") DO NOTHING
      `,
        [IDS.roleGroup, JSON.stringify(QLDLRoleGroupPerms)],
      );
    }

    if (hasOrganizations[0]?.exists === true) {
      await queryRunner.query(
        `
        INSERT INTO "organizations" (
          "id", "code", "name", "parent_id", "head_user_id", "level", "is_active", "description", "created_at", "updated_at", "deleted_at"
        )
        VALUES ($1, 'XA-ROOT', 'UBND Xã (mẫu)', NULL, NULL, 1, true, 'Đơn vị gốc cho dữ liệu mẫu', now(), now(), NULL)
        ON CONFLICT ("code") DO NOTHING
      `,
        [IDS.org],
      );
    }

    const orgIdExpr =
      hasOrganizations[0]?.exists === true
        ? `(SELECT o."id" FROM "organizations" o WHERE o."code" = 'XA-ROOT' LIMIT 1)`
        : 'NULL';
    const roleGroupIdExpr =
      hasRoleGroups[0]?.exists === true
        ? `(SELECT rg."id" FROM "role_groups" rg WHERE rg."name" = 'Quản trị hệ thống' LIMIT 1)`
        : 'NULL';

    await queryRunner.query(
      `
      INSERT INTO "users" (
        "id",
        "username",
        "email",
        "password_hash",
        "full_name",
        "phone",
        "department_id",
        "status",
        "last_login",
        "created_at",
        "updated_at",
        "deleted_at",
        "code",
        "org_id",
        "role_group_id",
        "avatar_url",
        "failed_login_attempts",
        "locked_until",
        "totp_secret",
        "totp_enabled",
        "notify_channel",
        "language",
        "timezone"
      )
      VALUES (
        $1::uuid,
        'admin',
        'admin@localhost.local',
        crypt('Admin@123', gen_salt('bf', 12)),
        'Quản trị viên',
        NULL,
        NULL,
        'active',
        NULL,
        now(),
        now(),
        NULL,
        'ADM001',
        ${orgIdExpr},
        ${roleGroupIdExpr},
        NULL,
        0,
        NULL,
        NULL,
        false,
        'both',
        'vi',
        'Asia/Ho_Chi_Minh'
      )
      ON CONFLICT ("username") DO NOTHING
    `,
      [IDS.adminUser],
    );

    await queryRunner.query(`
      UPDATE "users" SET
        "code" = COALESCE(NULLIF("code", ''), 'ADM001'),
        "updated_at" = now()
      WHERE "username" = 'admin'
    `);

    if (hasOrganizations[0]?.exists === true) {
      await queryRunner.query(`
        UPDATE "users" SET
          "org_id" = COALESCE("org_id", (SELECT o."id" FROM "organizations" o WHERE o."code" = 'XA-ROOT' LIMIT 1)),
          "updated_at" = now()
        WHERE "username" = 'admin'
      `);
    }

    if (hasRoleGroups[0]?.exists === true) {
      await queryRunner.query(`
        UPDATE "users" SET
          "role_group_id" = COALESCE(
            "role_group_id",
            (SELECT rg."id" FROM "role_groups" rg WHERE rg."name" = 'Quản trị hệ thống' LIMIT 1)
          ),
          "updated_at" = now()
        WHERE "username" = 'admin'
      `);
    }

    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role_id")
      SELECT u."id", r."id"
      FROM "users" u
      CROSS JOIN "roles" r
      WHERE u."username" = 'admin' AND r."code" = 'SUPER_ADMIN'
      ON CONFLICT ("user_id", "role_id") DO NOTHING
    `);

    if (hasUserRoleGroups[0]?.exists === true && hasRoleGroups[0]?.exists === true) {
      await queryRunner.query(`
        INSERT INTO "user_role_groups" ("user_id", "role_group_id")
        SELECT u."id", rg."id"
        FROM "users" u
        CROSS JOIN "role_groups" rg
        WHERE u."username" = 'admin' AND rg."name" = 'Quản trị hệ thống'
        ON CONFLICT ("user_id", "role_group_id") DO NOTHING
      `);
    }

    if (hasOrganizations[0]?.exists === true) {
      await queryRunner.query(`
        UPDATE "organizations" o
        SET "head_user_id" = u."id", "updated_at" = now()
        FROM "users" u
        WHERE u."username" = 'admin' AND o."code" = 'XA-ROOT'
      `);
    }

    if (hasReportPeriods[0]?.exists === true) {
      await queryRunner.query(
        `
        INSERT INTO "report_periods" (
          "id", "code", "name", "period_type", "date_from", "date_to", "is_active", "created_by", "created_at"
        )
        VALUES
          ($1::uuid, 'K202601', 'Kỳ báo cáo tháng 01/2026', 'THANG', '2026-01-01', '2026-01-31', true,
           (SELECT "id" FROM "users" WHERE "username" = 'admin' LIMIT 1), now()),
          ($2::uuid, 'K2026Q1', 'Kỳ báo cáo Quý 1/2026', 'QUY', '2026-01-01', '2026-03-31', true,
           (SELECT "id" FROM "users" WHERE "username" = 'admin' LIMIT 1), now())
        ON CONFLICT ("code") DO NOTHING
      `,
        [IDS.periodMonth, IDS.periodQuarter],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "report_periods" WHERE "code" IN ('K202601', 'K2026Q1')`);

    await queryRunner.query(`
      UPDATE "organizations" SET "head_user_id" = NULL, "updated_at" = now()
      WHERE "code" = 'XA-ROOT'
    `);

    await queryRunner.query(`
      DELETE FROM "user_role_groups" urg
      USING "users" u, "role_groups" rg
      WHERE urg."user_id" = u."id" AND urg."role_group_id" = rg."id"
        AND u."username" = 'admin' AND rg."name" = 'Quản trị hệ thống'
    `);

    await queryRunner.query(`
      DELETE FROM "user_roles" ur
      USING "users" u, "roles" r
      WHERE ur."user_id" = u."id" AND ur."role_id" = r."id"
        AND u."username" = 'admin' AND r."code" = 'SUPER_ADMIN'
    `);

    await queryRunner.query(`
      DELETE FROM "users" WHERE "username" = 'admin' AND "email" = 'admin@localhost.local'
    `);

    await queryRunner.query(`
      DELETE FROM "role_permissions" rp
      USING "roles" r
      WHERE rp."role_id" = r."id" AND r."code" = 'SUPER_ADMIN'
    `);

    await queryRunner.query(`
      DELETE FROM "roles" WHERE "code" = 'SUPER_ADMIN'
    `);

    await queryRunner.query(`
      DELETE FROM "permissions" WHERE "code" IN (
        'users.manage','roles.manage','orgs.manage','periods.manage','forms.manage',
        'assignments.manage','submissions.manage','approvals.manage','summaries.manage',
        'analytics.read','audit.read'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "organizations" WHERE "code" = 'XA-ROOT'
    `);

    await queryRunner.query(`
      DELETE FROM "role_groups" WHERE "name" = 'Quản trị hệ thống' AND "is_system" = true
    `);

    // Không DROP bảng rbac (có thể đã dùng trước seed); chỉ gỡ dữ liệu seed ở trên.
  }
}
