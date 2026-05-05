import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCanAssignReportsToOrganizations1777365000000
  implements MigrationInterface
{
  name = 'AddCanAssignReportsToOrganizations1777365000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
      ADD COLUMN IF NOT EXISTS "can_assign_reports" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
      DROP COLUMN IF EXISTS "can_assign_reports"
    `);
  }
}

