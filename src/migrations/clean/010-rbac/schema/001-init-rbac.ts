import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRbac1863000001000 implements MigrationInterface {
  name = 'InitRbac1863000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
  }
}
