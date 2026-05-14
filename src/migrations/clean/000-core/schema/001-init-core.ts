import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCore1863000000000 implements MigrationInterface {
  name = 'InitCore1863000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
          CREATE TYPE "users_status_enum" AS ENUM ('active', 'inactive', 'suspended');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" varchar(100) NOT NULL,
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "code" varchar(20) NULL,
        "full_name" varchar(255) NULL,
        "phone" varchar(20) NULL,
        "org_id" uuid NULL,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" timestamptz NULL,
        "status" "users_status_enum" NOT NULL DEFAULT 'active',
        "last_login" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_code"
      ON "users" ("code")
      WHERE "code" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schema_migration_locks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "lock_key" varchar(100) NOT NULL UNIQUE,
        "owner" varchar(100) NOT NULL,
        "acquired_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "idempotency_keys" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "scope" varchar(100) NOT NULL,
        "idempotency_key" varchar(128) NOT NULL,
        "request_hash" varchar(128) NOT NULL,
        "response_payload" jsonb NULL,
        "status_code" integer NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        CONSTRAINT "uq_idempotency_scope_key" UNIQUE ("scope", "idempotency_key")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_idempotency_expires_at" ON "idempotency_keys" ("expires_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_idempotency_scope_created_at" ON "idempotency_keys" ("scope", "created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_idempotency_scope_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_idempotency_expires_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schema_migration_locks"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN DROP TYPE "users_status_enum"; END IF; END $$;`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pgcrypto`);
  }
}
