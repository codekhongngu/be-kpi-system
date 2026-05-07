import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateCampaignRefactor1779000000000 implements MigrationInterface {
  name = 'AddTemplateCampaignRefactor1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "forms"
      ADD COLUMN IF NOT EXISTS "template_type" varchar(20) NOT NULL DEFAULT 'AGGREGATE',
      ADD COLUMN IF NOT EXISTS "template_status" varchar(20) NOT NULL DEFAULT 'DRAFT'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_template_indicator_org_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_indicators"("id") ON DELETE CASCADE,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "UQ_form_template_indicator_org_rules" UNIQUE ("template_id", "org_id", "indicator_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "assignment_batches"
      ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
      ADD COLUMN IF NOT EXISTS "dispatched_at" timestamptz NULL,
      ADD COLUMN IF NOT EXISTS "dispatched_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "assignment_indicator_scopes"
      ADD COLUMN IF NOT EXISTS "source" varchar(30) NOT NULL DEFAULT 'MANUAL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignment_indicator_scopes"
      DROP COLUMN IF EXISTS "source"
    `);

    await queryRunner.query(`
      ALTER TABLE "assignment_batches"
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "dispatched_at",
      DROP COLUMN IF EXISTS "dispatched_by"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "form_template_indicator_org_rules"`);

    await queryRunner.query(`
      ALTER TABLE "forms"
      DROP COLUMN IF EXISTS "template_type",
      DROP COLUMN IF EXISTS "template_status"
    `);
  }
}
