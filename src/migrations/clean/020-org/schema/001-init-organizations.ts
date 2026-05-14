import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitOrganizations1863000002000 implements MigrationInterface {
  name = 'InitOrganizations1863000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL,
        "name" varchar(255) NOT NULL,
        "parent_id" uuid NULL REFERENCES "organizations"("id") ON DELETE SET NULL,
        "level" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        "can_assign_reports" boolean NOT NULL DEFAULT true,
        "description" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NULL,
        "deleted_at" timestamptz NULL,
        CONSTRAINT "UQ_organizations_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_closure" (
        "ancestor_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "descendant_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "depth" integer NOT NULL,
        CONSTRAINT "PK_organization_closure" PRIMARY KEY ("ancestor_id", "descendant_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organization_closure_descendant" ON "organization_closure" ("descendant_id", "depth")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organization_closure_ancestor" ON "organization_closure" ("ancestor_id", "depth")`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_organization_closure()
      RETURNS void AS $$
      BEGIN
        DELETE FROM organization_closure;

        WITH RECURSIVE tree AS (
          SELECT o.id AS ancestor_id, o.id AS descendant_id, 0 AS depth
          FROM organizations o
          UNION ALL
          SELECT t.ancestor_id, c.id AS descendant_id, t.depth + 1
          FROM tree t
          JOIN organizations c ON c.parent_id = t.descendant_id
        )
        INSERT INTO organization_closure (ancestor_id, descendant_id, depth)
        SELECT DISTINCT ancestor_id, descendant_id, depth FROM tree;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION rebuild_organization_closure()
      RETURNS trigger AS $$
      BEGIN
        PERFORM refresh_organization_closure();
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_rebuild_organization_closure ON "organizations"`);
    await queryRunner.query(`
      CREATE TRIGGER trg_rebuild_organization_closure
      AFTER INSERT OR UPDATE OR DELETE ON "organizations"
      FOR EACH STATEMENT EXECUTE FUNCTION rebuild_organization_closure()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_rebuild_organization_closure ON "organizations"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS rebuild_organization_closure()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS refresh_organization_closure()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_closure"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
  }
}
