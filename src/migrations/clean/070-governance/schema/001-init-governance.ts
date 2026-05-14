import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitGovernance1863000007000 implements MigrationInterface {
  name = 'InitGovernance1863000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_outbox_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "aggregate_type" varchar(100) NOT NULL DEFAULT 'notification',
        "aggregate_id" uuid NOT NULL,
        "event_type" varchar(160) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "retry_count" integer NOT NULL DEFAULT 0,
        "processed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_outbox_status" CHECK (status IN ('PENDING','PROCESSING','PROCESSED','FAILED'))
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_outbox_status_next_retry" ON "app_outbox_events" ("status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "action" varchar(100) NOT NULL,
        "entityType" varchar(100) NOT NULL,
        "entityId" uuid NULL,
        "oldValues" jsonb NULL,
        "newValues" jsonb NULL,
        "description" varchar(500) NULL,
        "ipAddress" inet NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_entityType_entityId" ON "audit_logs" ("entityType", "entityId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_userId_createdAt" ON "audit_logs" ("userId", "createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(128) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
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
      CREATE TABLE IF NOT EXISTS "auth_otp_challenges" (
        "id" varchar(64) PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "channel" varchar(20) NOT NULL,
        "otp_hash" varchar(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz NULL,
        "retry_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

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
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_otp_challenges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_password_resets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_outbox_events"`);
  }
}
