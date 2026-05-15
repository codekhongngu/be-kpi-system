import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameReportSubmissionCellsValueNumber1863000006000
  implements MigrationInterface
{
  name = 'RenameReportSubmissionCellsValueNumber1863000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'report_submission_cells'
            AND column_name = 'value_numeric'
        ) AND EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'report_submission_cells'
            AND column_name = 'value_number'
        ) THEN
          UPDATE report_submission_cells
          SET value_number = COALESCE(value_number, value_numeric);
          ALTER TABLE report_submission_cells DROP COLUMN value_numeric;
        ELSIF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'report_submission_cells'
            AND column_name = 'value_numeric'
        ) THEN
          ALTER TABLE report_submission_cells
          RENAME COLUMN value_numeric TO value_number;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'report_submission_cells'
            AND column_name = 'value_number'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'report_submission_cells'
            AND column_name = 'value_numeric'
        ) THEN
          ALTER TABLE report_submission_cells
          RENAME COLUMN value_number TO value_numeric;
        END IF;
      END $$;
    `);
  }
}
