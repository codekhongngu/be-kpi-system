import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropReportPeriods1745230800004 implements MigrationInterface {
  name = 'DropReportPeriods1745230800004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        ADD COLUMN IF NOT EXISTS "period_type" varchar(10),
        ADD COLUMN IF NOT EXISTS "period_from" date,
        ADD COLUMN IF NOT EXISTS "period_to" date,
        ADD COLUMN IF NOT EXISTS "period_code" varchar(30) NULL,
        ADD COLUMN IF NOT EXISTS "period_name" varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "report_summaries"
        ADD COLUMN IF NOT EXISTS "period_type" varchar(10),
        ADD COLUMN IF NOT EXISTS "period_from" date,
        ADD COLUMN IF NOT EXISTS "period_to" date,
        ADD COLUMN IF NOT EXISTS "period_code" varchar(30) NULL,
        ADD COLUMN IF NOT EXISTS "period_name" varchar(255) NULL
    `);

    const hasReportPeriods = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'report_periods'
      ) AS "exists"
    `);

    if (hasReportPeriods?.[0]?.exists === true) {
      await queryRunner.query(`
        UPDATE "form_assignments" a
        SET
          "period_type" = p."period_type",
          "period_from" = p."date_from",
          "period_to" = p."date_to",
          "period_code" = p."code",
          "period_name" = p."name"
        FROM "report_periods" p
        WHERE a."period_id" = p."id"
          AND (a."period_type" IS NULL OR a."period_from" IS NULL OR a."period_to" IS NULL)
      `);

      await queryRunner.query(`
        UPDATE "report_summaries" s
        SET
          "period_type" = p."period_type",
          "period_from" = p."date_from",
          "period_to" = p."date_to",
          "period_code" = p."code",
          "period_name" = p."name"
        FROM "report_periods" p
        WHERE s."period_id" = p."id"
          AND (s."period_type" IS NULL OR s."period_from" IS NULL OR s."period_to" IS NULL)
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        ALTER COLUMN "period_type" SET NOT NULL,
        ALTER COLUMN "period_from" SET NOT NULL,
        ALTER COLUMN "period_to" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "report_summaries"
        ALTER COLUMN "period_type" SET NOT NULL,
        ALTER COLUMN "period_from" SET NOT NULL,
        ALTER COLUMN "period_to" SET NOT NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "form_assignments" DROP CONSTRAINT IF EXISTS "UQ_form_assignments_form_org_period"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_summaries" DROP CONSTRAINT IF EXISTS "UQ_report_summaries_form_period_org"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_form_assignments_org_period"`,
    );

    await queryRunner.query(
      `ALTER TABLE "form_assignments" DROP COLUMN IF EXISTS "period_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_summaries" DROP COLUMN IF EXISTS "period_id"`,
    );

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
      ADD CONSTRAINT "UQ_form_assignments_form_org_period_range"
      UNIQUE ("form_id", "org_id", "period_type", "period_from", "period_to")
    `);

    await queryRunner.query(`
      ALTER TABLE "report_summaries"
      ADD CONSTRAINT "UQ_report_summaries_form_period_range_org"
      UNIQUE ("form_id", "org_id", "period_type", "period_from", "period_to")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_assignments_org_period_range"
      ON "form_assignments" ("org_id", "period_type", "period_from", "period_to")
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "report_periods"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_periods" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(30) NOT NULL,
        "name" varchar(255) NOT NULL,
        "period_type" varchar(10) NOT NULL,
        "date_from" date NOT NULL,
        "date_to" date NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_report_periods_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "report_periods" ("code","name","period_type","date_from","date_to","is_active")
      SELECT DISTINCT
        COALESCE(x."period_code",
          CASE x."period_type"
            WHEN 'THANG' THEN 'K' || TO_CHAR(x."period_from", 'YYYYMM')
            WHEN 'QUY' THEN 'K' || TO_CHAR(x."period_from", 'YYYY') || 'Q' || CEIL(EXTRACT(MONTH FROM x."period_from") / 3.0)::int
            WHEN 'NAM' THEN 'K' || TO_CHAR(x."period_from", 'YYYY')
            WHEN 'TUAN' THEN 'K' || EXTRACT(ISOYEAR FROM x."period_from")::int || 'W' || LPAD(EXTRACT(WEEK FROM x."period_from")::int::text, 2, '0')
            ELSE 'K' || TO_CHAR(x."period_from", 'YYYYMM')
          END
        ) AS "code",
        COALESCE(x."period_name", 'Kỳ báo cáo') AS "name",
        x."period_type",
        x."period_from",
        x."period_to",
        true
      FROM (
        SELECT "period_type","period_from","period_to","period_code","period_name" FROM "form_assignments"
        UNION
        SELECT "period_type","period_from","period_to","period_code","period_name" FROM "report_summaries"
      ) x
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "form_assignments" ADD COLUMN IF NOT EXISTS "period_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "report_summaries" ADD COLUMN IF NOT EXISTS "period_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "form_assignments" a
      SET "period_id" = p."id"
      FROM "report_periods" p
      WHERE p."period_type" = a."period_type"
        AND p."date_from" = a."period_from"
        AND p."date_to" = a."period_to"
        AND p."code" = COALESCE(a."period_code", p."code")
    `);
    await queryRunner.query(`
      UPDATE "report_summaries" s
      SET "period_id" = p."id"
      FROM "report_periods" p
      WHERE p."period_type" = s."period_type"
        AND p."date_from" = s."period_from"
        AND p."date_to" = s."period_to"
        AND p."code" = COALESCE(s."period_code", p."code")
    `);

    await queryRunner.query(
      `ALTER TABLE "form_assignments" DROP CONSTRAINT IF EXISTS "UQ_form_assignments_form_org_period_range"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_summaries" DROP CONSTRAINT IF EXISTS "UQ_report_summaries_form_period_range_org"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_form_assignments_org_period_range"`,
    );

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        ALTER COLUMN "period_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "report_summaries"
        ALTER COLUMN "period_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
      ADD CONSTRAINT "UQ_form_assignments_form_org_period"
      UNIQUE ("form_id", "org_id", "period_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "report_summaries"
      ADD CONSTRAINT "UQ_report_summaries_form_period_org"
      UNIQUE ("form_id", "period_id", "org_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_assignments_org_period"
      ON "form_assignments" ("org_id", "period_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        DROP COLUMN IF EXISTS "period_type",
        DROP COLUMN IF EXISTS "period_from",
        DROP COLUMN IF EXISTS "period_to",
        DROP COLUMN IF EXISTS "period_code",
        DROP COLUMN IF EXISTS "period_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "report_summaries"
        DROP COLUMN IF EXISTS "period_type",
        DROP COLUMN IF EXISTS "period_from",
        DROP COLUMN IF EXISTS "period_to",
        DROP COLUMN IF EXISTS "period_code",
        DROP COLUMN IF EXISTS "period_name"
    `);
  }
}

