import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSubmissions1863000005000 implements MigrationInterface {
  name = 'InitSubmissions1863000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_flow_event_enum') THEN
          CREATE TYPE "submission_flow_event_enum" AS ENUM ('SUBMIT', 'FORWARD', 'REJECT', 'APPROVE');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_submissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(25) NOT NULL,
        "assignment_id" uuid NOT NULL REFERENCES "report_assignments"("id") ON DELETE RESTRICT,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "version" integer NOT NULL DEFAULT 1,
        "note" text NULL,
        "reject_reason" text NULL,
        "completion_pct" numeric(5,2) NULL,
        "submitted_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "submitted_at" timestamptz NULL,
        "department_approved_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "department_approved_at" timestamptz NULL,
        "district_approved_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "district_approved_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        CONSTRAINT "UQ_report_submissions_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_submission_cells" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "submission_id" uuid NOT NULL REFERENCES "report_submissions"("id") ON DELETE CASCADE,
        "indicator_id" uuid NOT NULL REFERENCES "form_template_indicators"("id") ON DELETE RESTRICT,
        "attribute_id" uuid NOT NULL REFERENCES "form_template_attributes"("id") ON DELETE RESTRICT,
        "value_text" text NULL,
        "value_number" numeric NULL,
        "updated_by" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_report_submission_cells" UNIQUE ("submission_id", "indicator_id", "attribute_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "submission_flow_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "submission_id" uuid NOT NULL REFERENCES "report_submissions"("id") ON DELETE CASCADE,
        "event" "submission_flow_event_enum" NOT NULL,
        "from_status" varchar(50) NULL,
        "to_status" varchar(50) NOT NULL,
        "snapshot" jsonb NULL,
        "actor_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "note" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "submission_flow_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_submission_cells"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_submissions"`);
    await queryRunner.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_flow_event_enum') THEN DROP TYPE "submission_flow_event_enum"; END IF; END $$;`);
  }
}
