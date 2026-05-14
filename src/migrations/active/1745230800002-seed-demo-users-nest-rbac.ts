import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed 4 tài khoản demo (Nest RBAC):
 * - system_admin, data_manager, data_entry, approver (password: Admin@123)
 *
 * Seed kèm roles + role_permissions + user_roles theo permission codes.
 *
 * Idempotent: ON CONFLICT / DO NOTHING an toàn khi chạy nhiều lần.
 */
const IDS = {
  users: {
    systemAdmin: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d1',
    dataManager: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d2',
    dataEntry: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d3',
    approver: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d4',
  },
  roles: {
    systemAdmin: 'f0e0d0c0-b0a0-4a90-8c00-0000000000e1',
    dataManager: 'f0e0d0c0-b0a0-4a90-8c00-0000000000e2',
    dataEntry: 'f0e0d0c0-b0a0-4a90-8c00-0000000000e3',
    approver: 'f0e0d0c0-b0a0-4a90-8c00-0000000000e4',
  },
} as const;

const PASSWORD = 'Admin@123';

const PERMS = {
  // admin/system
  usersManage: 'users.manage',
  usersExport: 'users.export',
  rolesManage: 'roles.manage',
  auditRead: 'audit.read',

  // qldl
  orgsManage: 'orgs.manage',
  periodsManage: 'periods.manage',
  formsManage: 'forms.manage',
  assignmentsManage: 'assignments.manage',
  submissionsManage: 'submissions.manage',
  approvalsManage: 'approvals.manage',
  summariesManage: 'summaries.manage',
  analyticsRead: 'analytics.read',
  analyticsExport: 'analytics.export',
  monitoringRead: 'monitoring.read',
  monitoringManage: 'monitoring.manage',
  notificationsRead: 'notifications.read',
  reportsRead: 'reports.read',
  reportsExport: 'reports.export',
} as const;

export class SeedDemoUsersNestRbac1745230800002 implements MigrationInterface {
  name = 'SeedDemoUsersNestRbac1745230800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    const hasRoles = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'roles'
      ) AS "exists"
    `);
    const hasPermissions = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'permissions'
      ) AS "exists"
    `);
    const hasRolePermissions = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'role_permissions'
      ) AS "exists"
    `);
    const hasUserRoles = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
      ) AS "exists"
    `);
    const hasUsers = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS "exists"
    `);

    if (
      hasRoles[0]?.exists !== true ||
      hasPermissions[0]?.exists !== true ||
      hasRolePermissions[0]?.exists !== true ||
      hasUserRoles[0]?.exists !== true ||
      hasUsers[0]?.exists !== true
    ) {
      return;
    }

    // Ensure base org exists (seed from 0001). If not, fallback org_id = NULL.
    const org = await queryRunner.query(`
      SELECT "id" FROM "organizations" WHERE "code" = 'XA-ROOT' LIMIT 1
    `);
    const orgIdExpr = org?.length ? `'${org[0].id}'::uuid` : 'NULL';

    // Create roles (idempotent)
    await queryRunner.query(
      `
      INSERT INTO "roles" ("id","code","name","description","is_system","created_at","updated_at","deleted_at")
      VALUES
        ($1::uuid,'SYSTEM_ADMIN','System Admin','Quyền vận hành hệ thống (seed)',true,now(),now(),NULL),
        ($2::uuid,'DATA_MANAGER','Data Manager','Quản lý kỳ/biểu mẫu/giao việc/tổng hợp/giám sát (seed)',false,now(),now(),NULL),
        ($3::uuid,'DATA_ENTRY','Data Entry','Nhập liệu & nộp báo cáo (seed)',false,now(),now(),NULL),
        ($4::uuid,'APPROVER','Approver','Duyệt / từ chối báo cáo (seed)',false,now(),now(),NULL)
      ON CONFLICT ("code") DO NOTHING
    `,
      [
        IDS.roles.systemAdmin,
        IDS.roles.dataManager,
        IDS.roles.dataEntry,
        IDS.roles.approver,
      ],
    );

    // Role → permissions mapping
    const rolePerms: Record<string, string[]> = {
      SYSTEM_ADMIN: [
        PERMS.usersManage,
        PERMS.usersExport,
        PERMS.rolesManage,
        PERMS.auditRead,
        PERMS.orgsManage,
        PERMS.periodsManage,
        PERMS.formsManage,
        PERMS.assignmentsManage,
        PERMS.submissionsManage,
        PERMS.approvalsManage,
        PERMS.summariesManage,
        PERMS.analyticsRead,
        PERMS.analyticsExport,
        PERMS.monitoringRead,
        PERMS.monitoringManage,
        PERMS.notificationsRead,
        PERMS.reportsRead,
        PERMS.reportsExport,
      ],
      DATA_MANAGER: [
        PERMS.periodsManage,
        PERMS.formsManage,
        PERMS.assignmentsManage,
        PERMS.summariesManage,
        PERMS.analyticsRead,
        PERMS.analyticsExport,
        PERMS.monitoringRead,
        PERMS.monitoringManage,
        PERMS.notificationsRead,
        PERMS.reportsRead,
        PERMS.reportsExport,
      ],
      DATA_ENTRY: [
        PERMS.submissionsManage,
        PERMS.notificationsRead,
        PERMS.reportsRead,
        PERMS.reportsExport,
      ],
      APPROVER: [
        PERMS.approvalsManage,
        PERMS.notificationsRead,
        PERMS.reportsRead,
        PERMS.reportsExport,
      ],
    };

    for (const [roleCode, permCodes] of Object.entries(rolePerms)) {
      for (const permCode of permCodes) {
        await queryRunner.query(
          `
          INSERT INTO "role_permissions" ("role_id","permission_id")
          SELECT r."id", p."id"
          FROM "roles" r
          JOIN "permissions" p ON p."code" = $2
          WHERE r."code" = $1
          ON CONFLICT ("role_id","permission_id") DO NOTHING
        `,
          [roleCode, permCode],
        );
      }
    }

    // Create users (idempotent)
    const demoUsers: Array<{
      id: string;
      username: string;
      email: string;
      fullName: string;
      code: string;
      roleCode: keyof typeof rolePerms;
    }> = [
      {
        id: IDS.users.systemAdmin,
        username: 'system_admin',
        email: 'system_admin@localhost.local',
        fullName: 'System Admin (seed)',
        code: 'SYSTEM_ADMIN',
        roleCode: 'SYSTEM_ADMIN',
      },
      {
        id: IDS.users.dataManager,
        username: 'data_manager',
        email: 'data_manager@localhost.local',
        fullName: 'Data Manager (seed)',
        code: 'DATA_MANAGER',
        roleCode: 'DATA_MANAGER',
      },
      {
        id: IDS.users.dataEntry,
        username: 'data_entry',
        email: 'data_entry@localhost.local',
        fullName: 'Data Entry (seed)',
        code: 'DATA_ENTRY',
        roleCode: 'DATA_ENTRY',
      },
      {
        id: IDS.users.approver,
        username: 'approver',
        email: 'approver@localhost.local',
        fullName: 'Approver (seed)',
        code: 'APPROVER',
        roleCode: 'APPROVER',
      },
    ];

    for (const u of demoUsers) {
      await queryRunner.query(
        `
        INSERT INTO "users" (
          "id",
          "username",
          "email",
          "full_name",
          "code",
          "password_hash",
          "status",
          "org_id",
          "created_at",
          "updated_at",
          "deleted_at"
        )
        VALUES (
          $1::uuid,
          $2,
          $3,
          $4,
          $5,
          crypt($6, gen_salt('bf')),
          'active',
          ${orgIdExpr},
          now(),
          now(),
          NULL
        )
        ON CONFLICT ("username") DO NOTHING
      `,
        [u.id, u.username, u.email, u.fullName, u.code, PASSWORD],
      );

      await queryRunner.query(
        `
        INSERT INTO "user_roles" ("user_id","role_id")
        SELECT uu."id", rr."id"
        FROM "users" uu
        JOIN "roles" rr ON rr."code" = $2
        WHERE uu."username" = $1
        ON CONFLICT ("user_id","role_id") DO NOTHING
      `,
        [u.username, u.roleCode],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUserRoles = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
      ) AS "exists"
    `);
    const hasUsers = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS "exists"
    `);
    const hasRoles = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'roles'
      ) AS "exists"
    `);

    if (
      hasUserRoles[0]?.exists !== true ||
      hasUsers[0]?.exists !== true ||
      hasRoles[0]?.exists !== true
    ) {
      return;
    }

    const usernames = [
      'system_admin',
      'data_manager',
      'data_entry',
      'approver',
    ];
    const roleCodes = [
      'SYSTEM_ADMIN',
      'DATA_MANAGER',
      'DATA_ENTRY',
      'APPROVER',
    ];

    await queryRunner.query(
      `
      DELETE FROM "user_roles" ur
      USING "users" u, "roles" r
      WHERE ur."user_id" = u."id"
        AND ur."role_id" = r."id"
        AND u."username" = ANY($1)
        AND r."code" = ANY($2)
    `,
      [usernames, roleCodes],
    );

    await queryRunner.query(
      `
      DELETE FROM "users"
      WHERE "username" = ANY($1)
    `,
      [usernames],
    );

    await queryRunner.query(
      `
      DELETE FROM "roles"
      WHERE "code" = ANY($1)
    `,
      [roleCodes],
    );
  }
}
