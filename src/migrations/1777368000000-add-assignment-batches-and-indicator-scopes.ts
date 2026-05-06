import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignmentBatchesAndIndicatorScopes1777368000000
  implements MigrationInterface
{
  name = 'AddAssignmentBatchesAndIndicatorScopes1777368000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assignment_batches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE RESTRICT,
        "period_type" varchar(10) NOT NULL,
        "period_code" varchar(30) NOT NULL,
        "period_name" varchar(255) NULL,
        "deadline_from" date NOT NULL,
        "deadline_to" date NOT NULL,
        "created_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_assignment_batches_form_period" UNIQUE ("form_id", "period_type", "period_code")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        ADD COLUMN IF NOT EXISTS "batch_id" uuid NULL REFERENCES "assignment_batches"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_assignments_batch"
      ON "form_assignments" ("batch_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assignment_indicator_scopes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "batch_id" uuid NOT NULL REFERENCES "assignment_batches"("id") ON DELETE CASCADE,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "indicator_id" uuid NOT NULL REFERENCES "form_indicators"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_assignment_indicator_scopes" UNIQUE ("batch_id", "org_id", "indicator_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_assignment_indicator_scopes_batch_org"
      ON "assignment_indicator_scopes" ("batch_id", "org_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_assignment_indicator_scopes_batch_org"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "assignment_indicator_scopes"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_form_assignments_batch"`);
    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        DROP COLUMN IF EXISTS "batch_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "assignment_batches"`);
  }
}
