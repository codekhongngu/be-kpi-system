import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFormCellConfigs1777362000000 implements MigrationInterface {
  name = 'AddFormCellConfigs1777362000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_cell_configs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "form_id" uuid NOT NULL,
        "indicator_id" uuid NOT NULL,
        "attribute_id" uuid NOT NULL,
        "is_editable" boolean NOT NULL DEFAULT true,
        "validation_rule" jsonb NULL,
        "default_value" text NULL,
        "data_type" varchar(20) NULL,
        "is_required" boolean NULL,
        "formula" text NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_form_cell_configs_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_form_cell_configs_form_indicator_attribute"
          UNIQUE ("form_id","indicator_id","attribute_id"),
        CONSTRAINT "FK_form_cell_configs_form_id"
          FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_form_cell_configs_indicator_id"
          FOREIGN KEY ("indicator_id") REFERENCES "form_indicators"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_form_cell_configs_attribute_id"
          FOREIGN KEY ("attribute_id") REFERENCES "form_attributes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_form_cell_configs_form" ON "form_cell_configs" ("form_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_form_cell_configs_form"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "form_cell_configs"`);
  }
}

