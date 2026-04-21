import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Init base `users` table for a fresh Postgres database.
 *
 * Needed because QLDL migrations reference `users(id)` via foreign keys and assume
 * `users` already exists (from starter schema / synchronize).
 */
export class InitUsersTable1745230799999 implements MigrationInterface {
  name = 'InitUsersTable1745230799999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Needed for gen_random_uuid() and bcrypt-compatible crypt() used by seed migration
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    // Some parts of the codebase/tooling may use uuid-ossp
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Match `UserStatus` enum values in `src/modules/user/entities/user.entity.ts`
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
        "full_name" varchar(255) NULL,
        "phone" varchar(20) NULL,
        "department_id" uuid NULL,
        "status" "users_status_enum" NOT NULL DEFAULT 'active',
        "last_login" timestamp NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
          DROP TYPE "users_status_enum";
        END IF;
      END$$;
    `);
  }
}

