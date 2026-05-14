import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed bộ tài khoản vận hành cấp xã theo cây đơn vị chuẩn.
 *
 * - Bổ sung 1 tài khoản super admin để vận hành hệ thống.
 * - Mỗi đơn vị có 2 tài khoản: manager và staff.
 * - `users.code` được chuẩn hóa thành giá trị duy nhất cho từng tài khoản.
 * - Manager được gán `DATA_MANAGER` + `APPROVER`, staff được gán `DATA_ENTRY`.
 * - Idempotent: upsert theo `username`, reset mapping `user_roles` trước khi gán lại.
 */
const PASSWORD = 'Admin@123';

const USERS = [
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000dd',
    username: 'super_admin',
    email: 'super_admin@localhost.local',
    code: 'SUPER_ADMIN',
    fullName: 'Super Admin',
    orgCode: 'XA-ROOT',
    roleCodes: ['SUPER_ADMIN'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d1',
    username: 'vp_manager',
    email: 'vp_manager@localhost.local',
    code: 'VP_MANAGER',
    fullName: 'Văn phòng HĐND & UBND - Manager',
    orgCode: 'XA-VPH',
    roleCodes: ['DATA_MANAGER', 'APPROVER'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d2',
    username: 'vp_staff',
    email: 'vp_staff@localhost.local',
    code: 'VP_STAFF',
    fullName: 'Văn phòng HĐND & UBND - Staff',
    orgCode: 'XA-VPH',
    roleCodes: ['DATA_ENTRY'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d3',
    username: 'kt_manager',
    email: 'kt_manager@localhost.local',
    code: 'KT_MANAGER',
    fullName: 'Phòng Kinh tế - Manager',
    orgCode: 'XA-PKT',
    roleCodes: ['DATA_MANAGER', 'APPROVER'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d4',
    username: 'kt_staff',
    email: 'kt_staff@localhost.local',
    code: 'KT_STAFF',
    fullName: 'Phòng Kinh tế - Staff',
    orgCode: 'XA-PKT',
    roleCodes: ['DATA_ENTRY'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d5',
    username: 'vhxh_manager',
    email: 'vhxh_manager@localhost.local',
    code: 'VHXH_MANAGER',
    fullName: 'Phòng Văn hóa - Xã hội - Manager',
    orgCode: 'XA-PVHXH',
    roleCodes: ['DATA_MANAGER', 'APPROVER'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d6',
    username: 'vhxh_staff',
    email: 'vhxh_staff@localhost.local',
    code: 'VHXH_STAFF',
    fullName: 'Phòng Văn hóa - Xã hội - Staff',
    orgCode: 'XA-PVHXH',
    roleCodes: ['DATA_ENTRY'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d7',
    username: 'hcc_manager',
    email: 'hcc_manager@localhost.local',
    code: 'HCC_MANAGER',
    fullName: 'Trung tâm HCC - Manager',
    orgCode: 'XA-TTPVHCC',
    roleCodes: ['DATA_MANAGER', 'APPROVER'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d8',
    username: 'hcc_staff',
    email: 'hcc_staff@localhost.local',
    code: 'HCC_STAFF',
    fullName: 'Trung tâm HCC - Staff',
    orgCode: 'XA-TTPVHCC',
    roleCodes: ['DATA_ENTRY'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000d9',
    username: 'ca_manager',
    email: 'ca_manager@localhost.local',
    code: 'CA_MANAGER',
    fullName: 'Công an Xã - Manager',
    orgCode: 'XA-CA',
    roleCodes: ['DATA_MANAGER', 'APPROVER'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000da',
    username: 'ca_staff',
    email: 'ca_staff@localhost.local',
    code: 'CA_STAFF',
    fullName: 'Công an Xã - Staff',
    orgCode: 'XA-CA',
    roleCodes: ['DATA_ENTRY'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000db',
    username: 'qs_manager',
    email: 'qs_manager@localhost.local',
    code: 'QS_MANAGER',
    fullName: 'Ban CHQS Xã - Manager',
    orgCode: 'XA-QS',
    roleCodes: ['DATA_MANAGER', 'APPROVER'],
  },
  {
    id: 'f0e0d0c0-b0a0-4a90-8c00-0000000000dc',
    username: 'qs_staff',
    email: 'qs_staff@localhost.local',
    code: 'QS_STAFF',
    fullName: 'Ban CHQS Xã - Staff',
    orgCode: 'XA-QS',
    roleCodes: ['DATA_ENTRY'],
  },
] as const;

export class SeedDemoUsersNestRbac1745230800002 implements MigrationInterface {
  name = 'SeedDemoUsersNestRbac1745230800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

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
    const hasUserRoles = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
      ) AS "exists"
    `);
    const hasOrganizations = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
      ) AS "exists"
    `);

    if (
      hasUsers[0]?.exists !== true ||
      hasRoles[0]?.exists !== true ||
      hasUserRoles[0]?.exists !== true ||
      hasOrganizations[0]?.exists !== true
    ) {
      return;
    }

    for (const user of USERS) {
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
          (SELECT o."id" FROM "organizations" o WHERE o."code" = $7 LIMIT 1),
          now(),
          now(),
          NULL
        )
        ON CONFLICT ("username") DO UPDATE SET
          "email" = EXCLUDED."email",
          "full_name" = EXCLUDED."full_name",
          "code" = EXCLUDED."code",
          "password_hash" = EXCLUDED."password_hash",
          "status" = EXCLUDED."status",
          "org_id" = EXCLUDED."org_id",
          "updated_at" = now()
      `,
        [user.id, user.username, user.email, user.fullName, user.code, PASSWORD, user.orgCode],
      );
    }

    await queryRunner.query(
      `
      DELETE FROM "user_roles" ur
      USING "users" u
      WHERE ur."user_id" = u."id"
        AND u."username" = ANY($1)
    `,
      [USERS.map((user) => user.username)],
    );

    for (const user of USERS) {
      for (const roleCode of user.roleCodes) {
        await queryRunner.query(
          `
          INSERT INTO "user_roles" ("user_id", "role_id")
          SELECT u."id", r."id"
          FROM "users" u
          JOIN "roles" r ON r."code" = $2
          WHERE u."username" = $1
          ON CONFLICT ("user_id", "role_id") DO NOTHING
        `,
          [user.username, roleCode],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsers = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS "exists"
    `);
    const hasUserRoles = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
      ) AS "exists"
    `);

    if (hasUsers[0]?.exists !== true || hasUserRoles[0]?.exists !== true) {
      return;
    }

    const usernames = USERS.map((user) => user.username);

    await queryRunner.query(
      `
      DELETE FROM "user_roles" ur
      USING "users" u
      WHERE ur."user_id" = u."id"
        AND u."username" = ANY($1)
    `,
      [usernames],
    );

    await queryRunner.query(
      `
      DELETE FROM "users"
      WHERE "username" = ANY($1)
    `,
      [usernames],
    );
  }
}
