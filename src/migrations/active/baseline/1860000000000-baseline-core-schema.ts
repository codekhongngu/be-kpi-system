import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineCoreSchema1860000000000 implements MigrationInterface {
  name = 'BaselineCoreSchema1860000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
          CREATE TYPE "users_status_enum" AS ENUM ('active', 'inactive', 'suspended');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "parent_id" uuid NULL REFERENCES "organizations"("id") ON DELETE SET NULL,
        "head_user_id" uuid NULL,
        "level" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        "description" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        "deleted_at" timestamptz NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" varchar(100) NOT NULL UNIQUE,
        "email" varchar(255) NOT NULL UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "code" varchar(20) NULL,
        "full_name" varchar(255) NULL,
        "phone" varchar(20) NULL,
        "department_id" uuid NULL,
        "org_id" uuid NULL REFERENCES "organizations"("id") ON DELETE SET NULL,
        "avatar_url" text NULL,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" timestamptz NULL,
        "totp_secret" varchar(100) NULL,
        "totp_enabled" boolean NOT NULL DEFAULT false,
        "notify_channel" varchar(20) NOT NULL DEFAULT 'both',
        "language" varchar(10) NOT NULL DEFAULT 'vi',
        "timezone" varchar(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        "status" "users_status_enum" NOT NULL DEFAULT 'active',
        "last_login" timestamp NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_code" ON "users" ("code") WHERE "code" IS NOT NULL`);

    await queryRunner.query(`ALTER TABLE "organizations" ADD CONSTRAINT "FK_organizations_head_user" FOREIGN KEY ("head_user_id") REFERENCES "users"("id") ON DELETE SET NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL UNIQUE,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(100) NOT NULL UNIQUE,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "category" varchar(50) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL
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

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(128) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "ip_address" varchar(45) NULL,
        "user_agent" text NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_password_resets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(128) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "files" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "original_name" varchar(255) NOT NULL,
        "storage_path" varchar(500) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "size" bigint NOT NULL,
        "category" varchar(30) NOT NULL,
        "user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "is_public" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_files_user_created" ON "files" ("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_files_category" ON "files" ("category")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" varchar(50) NOT NULL,
        "title" varchar(500) NULL,
        "body" text NULL,
        "channel" varchar(20) NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "ref_table" varchar(100) NULL,
        "ref_id" bigint NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "retry_count" integer NOT NULL DEFAULT 0,
        "sent_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "action" varchar(20) NOT NULL,
        "table_name" varchar(100) NOT NULL,
        "record_id" bigint NULL,
        "old_value" jsonb NULL,
        "new_value" jsonb NULL,
        "ip_address" varchar(45) NULL,
        "user_agent" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "import_jobs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" varchar(30) NOT NULL,
        "status" varchar(20) NOT NULL,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "finished_at" timestamptz NULL,
        "summary" jsonb NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "import_jobs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_files_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_files_user_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "files"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_password_resets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`);
  }
}
