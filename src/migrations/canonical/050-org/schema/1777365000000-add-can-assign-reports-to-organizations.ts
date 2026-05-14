import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Legacy compatibility migration.
 *
 * This file is intentionally a no-op. The current canonical schema is defined by the
 * newer migrations that match the codebase.
 */
export class AddCanAssignReportsToOrganizations implements MigrationInterface {
  name = 'AddCanAssignReportsToOrganizations';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op.
  }
}
