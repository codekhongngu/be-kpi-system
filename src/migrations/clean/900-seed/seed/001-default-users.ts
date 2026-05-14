import { MigrationInterface, QueryRunner } from 'typeorm';

const PASSWORD = 'Admin@123';

const USERS = [
  ['super_admin', 'super_admin@localhost.local', 'SUPER_ADMIN', 'Super Admin', 'XA-ROOT', ['SUPER_ADMIN']],
  ['vp_manager', 'vp_manager@localhost.local', 'VP_MANAGER', 'Văn phòng HĐND & UBND - Manager', 'XA-VPH', ['DATA_MANAGER', 'APPROVER']],
  ['vp_staff', 'vp_staff@localhost.local', 'VP_STAFF', 'Văn phòng HĐND & UBND - Staff', 'XA-VPH', ['DATA_ENTRY']],
  ['kt_manager', 'kt_manager@localhost.local', 'KT_MANAGER', 'Phòng Kinh tế - Manager', 'XA-PKT', ['DATA_MANAGER', 'APPROVER']],
  ['kt_staff', 'kt_staff@localhost.local', 'KT_STAFF', 'Phòng Kinh tế - Staff', 'XA-PKT', ['DATA_ENTRY']],
  ['vhxh_manager', 'vhxh_manager@localhost.local', 'VHXH_MANAGER', 'Phòng Văn hóa - Xã hội - Manager', 'XA-PVHXH', ['DATA_MANAGER', 'APPROVER']],
  ['vhxh_staff', 'vhxh_staff@localhost.local', 'VHXH_STAFF', 'Phòng Văn hóa - Xã hội - Staff', 'XA-PVHXH', ['DATA_ENTRY']],
  ['hcc_manager', 'hcc_manager@localhost.local', 'HCC_MANAGER', 'Trung tâm HCC - Manager', 'XA-TTPVHCC', ['DATA_MANAGER', 'APPROVER']],
  ['hcc_staff', 'hcc_staff@localhost.local', 'HCC_STAFF', 'Trung tâm HCC - Staff', 'XA-TTPVHCC', ['DATA_ENTRY']],
  ['ca_manager', 'ca_manager@localhost.local', 'CA_MANAGER', 'Công an Xã - Manager', 'XA-CA', ['DATA_MANAGER', 'APPROVER']],
  ['ca_staff', 'ca_staff@localhost.local', 'CA_STAFF', 'Công an Xã - Staff', 'XA-CA', ['DATA_ENTRY']],
  ['qs_manager', 'qs_manager@localhost.local', 'QS_MANAGER', 'Ban CHQS Xã - Manager', 'XA-QS', ['DATA_MANAGER', 'APPROVER']],
  ['qs_staff', 'qs_staff@localhost.local', 'QS_STAFF', 'Ban CHQS Xã - Staff', 'XA-QS', ['DATA_ENTRY']],
] as const;

export class DefaultUsers1863000009000 implements MigrationInterface {
  name = 'DefaultUsers1863000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [username, email, code, fullName, orgCode, roles] of USERS) {
      await queryRunner.query(
        `
        INSERT INTO "users" ("username", "email", "password_hash", "code", "full_name", "org_id", "status", "created_at", "updated_at")
        VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5, (SELECT id FROM organizations WHERE code = $6 LIMIT 1), 'active', now(), now())
        ON CONFLICT ("username") DO UPDATE SET
          "email" = EXCLUDED."email",
          "password_hash" = EXCLUDED."password_hash",
          "code" = EXCLUDED."code",
          "full_name" = EXCLUDED."full_name",
          "org_id" = EXCLUDED."org_id",
          "updated_at" = now()
      `,
        [username, email, PASSWORD, code, fullName, orgCode],
      );

      await queryRunner.query(`DELETE FROM "user_roles" WHERE "user_id" = (SELECT id FROM "users" WHERE username = $1 LIMIT 1)`, [username]);
      for (const roleCode of roles) {
        await queryRunner.query(
          `
          INSERT INTO "user_roles" ("user_id", "role_id")
          SELECT u.id, r.id
          FROM users u JOIN roles r ON r.code = $2
          WHERE u.username = $1
          ON CONFLICT ("user_id", "role_id") DO NOTHING
        `,
          [username, roleCode],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usernames = USERS.map((u) => u[0]);
    await queryRunner.query(`DELETE FROM "user_roles" ur USING "users" u WHERE ur."user_id" = u."id" AND u."username" = ANY($1)`, [usernames]);
    await queryRunner.query(`DELETE FROM "users" WHERE "username" = ANY($1)`, [usernames]);
  }
}
