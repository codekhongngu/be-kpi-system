import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPeriodRangeFromFormAssignments1777367000000
  implements MigrationInterface
{
  name = 'DropPeriodRangeFromFormAssignments1777367000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'form_assignments'
            AND column_name = 'period_from'
        ) THEN
          UPDATE "form_assignments" a
          SET "period_code" = COALESCE(
            a."period_code",
            CASE a."period_type"
              WHEN 'THANG' THEN 'K' || TO_CHAR(a."period_from", 'YYYYMM')
              WHEN 'QUY' THEN 'K' || TO_CHAR(a."period_from", 'YYYY') || 'Q' || CEIL(EXTRACT(MONTH FROM a."period_from") / 3.0)::int
              WHEN 'NAM' THEN 'K' || TO_CHAR(a."period_from", 'YYYY')
              WHEN 'TUAN' THEN 'K' || EXTRACT(ISOYEAR FROM a."period_from")::int || 'W' || LPAD(EXTRACT(WEEK FROM a."period_from")::int::text, 2, '0')
              ELSE 'K' || TO_CHAR(a."period_from", 'YYYYMM')
            END
          )
          WHERE a."period_code" IS NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "form_assignments" DROP CONSTRAINT IF EXISTS "UQ_form_assignments_form_org_period_range"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_form_assignments_org_period_range"`,
    );

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        DROP COLUMN IF EXISTS "period_from",
        DROP COLUMN IF EXISTS "period_to"
    `);

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        ALTER COLUMN "period_code" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
      ADD CONSTRAINT "UQ_form_assignments_form_org_period_code"
      UNIQUE ("form_id", "org_id", "period_type", "period_code")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_assignments_org_period_code"
      ON "form_assignments" ("org_id", "period_type", "period_code")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "form_assignments" DROP CONSTRAINT IF EXISTS "UQ_form_assignments_form_org_period_code"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_form_assignments_org_period_code"`,
    );

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        ADD COLUMN IF NOT EXISTS "period_from" date NULL,
        ADD COLUMN IF NOT EXISTS "period_to" date NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
        ALTER COLUMN "period_code" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "form_assignments"
      ADD CONSTRAINT "UQ_form_assignments_form_org_period_range"
      UNIQUE ("form_id", "org_id", "period_type", "period_from", "period_to")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_form_assignments_org_period_range"
      ON "form_assignments" ("org_id", "period_type", "period_from", "period_to")
    `);
  }
}
