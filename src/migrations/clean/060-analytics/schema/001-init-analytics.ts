import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAnalytics1863000006000 implements MigrationInterface {
  name = 'InitAnalytics1863000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_summaries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "form_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE RESTRICT,
        "period_type" varchar(10) NOT NULL,
        "period_from" date NOT NULL,
        "period_to" date NOT NULL,
        "period_code" varchar(30) NULL,
        "period_name" varchar(255) NULL,
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "total_units" integer NULL,
        "submitted_units" integer NULL,
        "approved_units" integer NULL,
        "summary_data" jsonb NULL,
        "summarized_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "summarized_at" timestamptz NULL,
        "approved_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_report_summaries_form_period_range_org" UNIQUE ("form_id", "org_id", "period_type", "period_from", "period_to")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "report_summaries"`);
  }
}
