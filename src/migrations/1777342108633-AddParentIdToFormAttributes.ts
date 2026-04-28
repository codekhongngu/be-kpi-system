import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParentIdToFormAttributes1777342108633 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "form_attributes" ADD "parent_id" uuid`);
        await queryRunner.query(`ALTER TABLE "form_attributes" ADD CONSTRAINT "FK_form_attributes_parent" FOREIGN KEY ("parent_id") REFERENCES "form_attributes"("id") ON DELETE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "form_attributes" DROP CONSTRAINT "FK_form_attributes_parent"`);
        await queryRunner.query(`ALTER TABLE "form_attributes" DROP COLUMN "parent_id"`);
    }

}
