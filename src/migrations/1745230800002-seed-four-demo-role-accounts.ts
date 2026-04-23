import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung 4 tài khoản demo (System Admin / Data Manager / Data Entry / Approver).
 *
 * Tách riêng vì `1745230800001` đã được ghi trong bảng `migrations` trước khi thêm các user này —
 * TypeORM không chạy lại migration cũ khi chỉ sửa file.
 *
 * Idempotent: ON CONFLICT / COALESCE an toàn khi chạy nhiều lần hoặc đã seed trong 000001.
 */
const IDS = {
  rgSystemAdmin: 'f0e0d0c0-b0a0-4a90-8c00-0000000000c1',
  rgDataManager: 'f0e0d0c0-b0a0-4a90-8c00-0000000000c2',
  rgDataEntry: 'f0e0d0c0-b0a0-4a90-8c00-0000000000c3',
  rgApprover: 'f0e0d0c0-b0a0-4a90-8c00-0000000000c4',
  uSystemAdmin: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d1',
  uDataManager: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d2',
  uDataEntry: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d3',
  uApprover: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d4',
} as const;

const SEED_DEMO_PASSWORD = 'Admin@123';

const SEED_QLDL_FULL_PERMISSIONS: Record<string, string[]> = {
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

const SEED_QLDL_DATA_MANAGER_PERMISSIONS: Record<string, string[]> = {
  AUTH: ['READ', 'WRITE'],
  ADMIN_PERIODS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  DESIGN_FORMS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  OPS_ASSIGNMENTS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  OPS_MONITORING: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  OPS_SUMMARIES: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  QUERY_REPORTS: ['READ', 'EXPORT'],
  NOTIFICATIONS: ['READ'],
  ENTRY_SUBMISSIONS: ['READ', 'EXPORT'],
  ANALYTICS: ['READ', 'EXPORT'],
};

const SEED_QLDL_DATA_ENTRY_PERMISSIONS: Record<string, string[]> = {
  AUTH: ['READ', 'WRITE'],
  ENTRY_SUBMISSIONS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  QUERY_REPORTS: ['READ', 'EXPORT'],
};

const SEED_QLDL_APPROVER_PERMISSIONS: Record<string, string[]> = {
  AUTH: ['READ', 'WRITE'],
  APPROVALS: ['READ', 'WRITE', 'DELETE', 'EXPORT'],
  QUERY_REPORTS: ['READ', 'EXPORT'],
};

export class SeedFourDemoRoleAccounts1745230800002 implements MigrationInterface {
  name = 'SeedFourDemoRoleAccounts1745230800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

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
    const hasUserRoleGroups = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_role_groups'
      ) AS "exists"
    `);

    if (hasRoleGroups[0]?.exists !== true) {
      return;
    }

    const extraRoleGroups: Array<{
      id: string;
      name: string;
      description: string;
      permissions: Record<string, string[]>;
      isSystem: boolean;
    }> = [
      {
        id: IDS.rgSystemAdmin,
        name: 'System Admin (seed)',
        description: 'QLDL đầy đủ + dùng chung với tài khoản system_admin',
        permissions: SEED_QLDL_FULL_PERMISSIONS,
        isSystem: true,
      },
      {
        id: IDS.rgDataManager,
        name: 'Data Manager (seed)',
        description: 'Kỳ báo cáo, biểu mẫu, giao việc, giám sát, tổng hợp, tra cứu',
        permissions: SEED_QLDL_DATA_MANAGER_PERMISSIONS,
        isSystem: false,
      },
      {
        id: IDS.rgDataEntry,
        name: 'Data Entry (seed)',
        description: 'Nhập liệu / nộp báo cáo',
        permissions: SEED_QLDL_DATA_ENTRY_PERMISSIONS,
        isSystem: false,
      },
      {
        id: IDS.rgApprover,
        name: 'Approver (seed)',
        description: 'Duyệt / từ chối báo cáo',
        permissions: SEED_QLDL_APPROVER_PERMISSIONS,
        isSystem: false,
      },
    ];

    for (const rg of extraRoleGroups) {
      await queryRunner.query(
        `
        INSERT INTO "role_groups" ("id", "name", "description", "permissions", "is_system", "created_at", "updated_at")
        VALUES ($1::uuid, $2, $3, $4::jsonb, $5, now(), now())
        ON CONFLICT ("id") DO NOTHING
      `,
        [rg.id, rg.name, rg.description, JSON.stringify(rg.permissions), rg.isSystem],
      );
    }

    const orgIdExpr =
      hasOrganizations[0]?.exists === true
        ? `(SELECT o."id" FROM "organizations" o WHERE o."code" = 'XA-ROOT' LIMIT 1)`
        : 'NULL';

    const seedDemoUsers: Array<{
      id: string;
      username: string;
      email: string;
      fullName: string;
      code: string;
      roleGroupId: string;
    }> = [
      {
        id: IDS.uSystemAdmin,
        username: 'system_admin',
        email: 'system_admin@localhost.local',
        fullName: 'System Admin (seed)',
        code: 'SYSADM',
        roleGroupId: IDS.rgSystemAdmin,
      },
      {
        id: IDS.uDataManager,
        username: 'data_manager',
        email: 'data_manager@localhost.local',
        fullName: 'Data Manager (seed)',
        code: 'DATAMGR',
        roleGroupId: IDS.rgDataManager,
      },
      {
        id: IDS.uDataEntry,
        username: 'data_entry',
        email: 'data_entry@localhost.local',
        fullName: 'Data Entry (seed)',
        code: 'DATAENT',
        roleGroupId: IDS.rgDataEntry,
      },
      {
        id: IDS.uApprover,
        username: 'approver',
        email: 'approver@localhost.local',
        fullName: 'Approver (seed)',
        code: 'APPROV',
        roleGroupId: IDS.rgApprover,
      },
    ];

    for (const u of seedDemoUsers) {
      await queryRunner.query(
        `
        INSERT INTO "users" (
          "id", "username", "email", "password_hash", "full_name", "phone", "department_id",
          "status", "last_login", "created_at", "updated_at", "deleted_at",
          "code", "org_id", "role_group_id", "avatar_url", "failed_login_attempts", "locked_until",
          "totp_secret", "totp_enabled", "notify_channel", "language", "timezone"
        ) VALUES (
          $1::uuid, $2, $3,
          crypt($4, gen_salt('bf', 12)),
          $5, NULL, NULL,
          'active', NULL, now(), now(), NULL,
          $6, ${orgIdExpr}, $7::uuid, NULL, 0, NULL,
          NULL, false, 'both', 'vi', 'Asia/Ho_Chi_Minh'
        )
        ON CONFLICT ("username") DO NOTHING
      `,
        [u.id, u.username, u.email, SEED_DEMO_PASSWORD, u.fullName, u.code, u.roleGroupId],
      );

      await queryRunner.query(
        `
        UPDATE "users" SET
          "code" = COALESCE(NULLIF("code", ''), $2),
          "role_group_id" = COALESCE("role_group_id", $3::uuid),
          "updated_at" = now()
        WHERE "username" = $1
      `,
        [u.username, u.code, u.roleGroupId],
      );

      if (hasOrganizations[0]?.exists === true) {
        await queryRunner.query(
          `
          UPDATE "users" SET
            "org_id" = COALESCE("org_id", (SELECT o."id" FROM "organizations" o WHERE o."code" = 'XA-ROOT' LIMIT 1)),
            "updated_at" = now()
          WHERE "username" = $1
        `,
          [u.username],
        );
      }
    }

    if (hasUserRoleGroups[0]?.exists === true) {
      for (const u of seedDemoUsers) {
        await queryRunner.query(
          `
          INSERT INTO "user_role_groups" ("user_id", "role_group_id")
          SELECT usr."id", $2::uuid
          FROM "users" usr
          WHERE usr."username" = $1
          ON CONFLICT ("user_id", "role_group_id") DO NOTHING
        `,
          [u.username, u.roleGroupId],
        );
      }
    }

    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role_id")
      SELECT u."id", r."id"
      FROM "users" u
      CROSS JOIN "roles" r
      WHERE u."username" = 'system_admin' AND r."code" = 'SUPER_ADMIN'
      ON CONFLICT ("user_id", "role_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "user_role_groups" urg
      USING "users" u
      WHERE urg."user_id" = u."id"
        AND u."username" IN ('system_admin', 'data_manager', 'data_entry', 'approver')
    `);

    await queryRunner.query(`
      DELETE FROM "user_roles" ur
      USING "users" u, "roles" r
      WHERE ur."user_id" = u."id" AND ur."role_id" = r."id"
        AND r."code" = 'SUPER_ADMIN'
        AND u."username" = 'system_admin'
    `);

    await queryRunner.query(`
      DELETE FROM "users"
      WHERE "username" IN ('system_admin', 'data_manager', 'data_entry', 'approver')
    `);

    await queryRunner.query(
      `
      DELETE FROM "role_groups"
      WHERE "id" IN ($1::uuid, $2::uuid, $3::uuid, $4::uuid)
    `,
      [IDS.rgSystemAdmin, IDS.rgDataManager, IDS.rgDataEntry, IDS.rgApprover],
    );
  }
}
