import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDisplayIndexToIndicators1777350300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'form_indicators',
      new TableColumn({
        name: 'display_index',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('form_indicators', 'display_index');
  }
}
