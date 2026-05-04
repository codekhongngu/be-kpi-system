import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPermissions1745230800003 implements MigrationInterface {
  name = 'AddMissingPermissions1745230800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("code","name","description","category","created_at","updated_at")
      VALUES
        ('dashboard.read','Xem dashboard',NULL,'QLDL',now(),now()),
        ('files.upload','Tải file',NULL,'admin',now(),now()),
        ('files.read','Xem file',NULL,'admin',now(),now()),
        ('files.delete','Xóa file',NULL,'admin',now(),now()),
        ('import-jobs.read','Xem trạng thái import',NULL,'admin',now(),now())
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id","permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      JOIN "permissions" p
        ON p."code" IN (
          'dashboard.read',
          'files.upload','files.read','files.delete',
          'import-jobs.read'
        )
      WHERE r."code" IN ('SUPER_ADMIN','SYSTEM_ADMIN')
      ON CONFLICT ("role_id","permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" rp
      USING "roles" r, "permissions" p
      WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
        AND r."code" IN ('SUPER_ADMIN','SYSTEM_ADMIN')
        AND p."code" IN (
          'dashboard.read',
          'files.upload','files.read','files.delete',
          'import-jobs.read'
        )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "code" IN (
        'dashboard.read',
        'files.upload','files.read','files.delete',
        'import-jobs.read'
      )
    `);
  }
}

