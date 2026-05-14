import { MigrationInterface, QueryRunner } from 'typeorm';

export class CoreFoundation1861000000000 implements MigrationInterface {
  name = 'CoreFoundation1861000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schema_migration_locks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        lock_key varchar(100) NOT NULL UNIQUE,
        owner varchar(100) NOT NULL,
        acquired_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        scope varchar(100) NOT NULL,
        idempotency_key varchar(128) NOT NULL,
        request_hash varchar(128) NOT NULL,
        response_payload jsonb NULL,
        status_code integer NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        CONSTRAINT uq_idempotency_scope_key UNIQUE (scope, idempotency_key)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at
      ON idempotency_keys (expires_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_scope_created_at
      ON idempotency_keys (scope, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_outbox_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        aggregate_type varchar(100) NOT NULL,
        aggregate_id uuid NOT NULL,
        event_type varchar(120) NOT NULL,
        payload jsonb NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        retry_count integer NOT NULL DEFAULT 0,
        next_retry_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz NULL,
        CONSTRAINT chk_outbox_status CHECK (status IN ('PENDING','PROCESSING','PROCESSED','FAILED'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_outbox_status_next_retry
      ON app_outbox_events (status, next_retry_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_outbox_aggregate
      ON app_outbox_events (aggregate_type, aggregate_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_aggregate`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_status_next_retry`);
    await queryRunner.query(`DROP TABLE IF EXISTS app_outbox_events`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_idempotency_scope_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_idempotency_expires_at`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys`);

    await queryRunner.query(`DROP TABLE IF EXISTS schema_migration_locks`);

    await queryRunner.query(`DROP EXTENSION IF EXISTS \"uuid-ossp\"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pgcrypto`);
  }
}
