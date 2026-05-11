import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintSubmissionAssignment1778408028086 implements MigrationInterface {
    name = 'AddUniqueConstraintSubmissionAssignment1778408028086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, clean up duplicate data intelligently - keep the most complete submission per assignment
        // This is a more sophisticated cleanup that preserves data
        
        // 1. Find and handle duplicates by keeping the most complete/latest submission
        await queryRunner.query(`
            WITH ranked_submissions AS (
                SELECT 
                    id,
                    assignment_id,
                    completion_pct,
                    created_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY assignment_id 
                        ORDER BY 
                            COALESCE(completion_pct, 0) DESC,
                            created_at DESC
                    ) as rn
                FROM report_submissions
            )
            DELETE FROM report_submissions 
            WHERE id IN (
                SELECT id FROM ranked_submissions WHERE rn > 1
            );
        `);

        // 2. Add the unique constraint to prevent future duplicates
        await queryRunner.query(`
            ALTER TABLE report_submissions 
            ADD CONSTRAINT UQ_report_submissions_assignment_id 
            UNIQUE (assignment_id)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE report_submissions 
            DROP CONSTRAINT UQ_report_submissions_assignment_id
        `);
    }
}
