import { MigrationInterface, QueryRunner } from 'typeorm';

const IDS = {
  rootOrg: 'f0e0d0c0-b0a0-4a90-8c00-000000000001',
  adminRole: 'f0e0d0c0-b0a0-4a90-8c00-000000000003',
  adminUser: 'f0e0d0c0-b0a0-4a90-8c00-000000000099',
  fieldCategory: 'f1e2d3c4-b5a6-4d7e-8f9a-0b1c2d3e4f5a',
  template: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
} as const;

const PASSWORD = 'Admin@123';

const PERMISSIONS = [
  ['users.manage', 'Quan ly tai khoan', 'admin'],
  ['roles.manage', 'Quan ly vai tro va phan quyen', 'admin'],
  ['orgs.manage', 'Quan ly don vi hanh chinh', 'qldl'],
  ['forms.manage', 'Thiet ke bieu mau', 'qldl'],
  ['assignments.manage', 'Giao va huy giao bao cao', 'qldl'],
  ['submissions.manage', 'Nhap lieu va gui bao cao', 'qldl'],
  ['approvals.manage', 'Duyet bao cao', 'qldl'],
  ['summaries.manage', 'Tong hop bao cao', 'qldl'],
  ['analytics.read', 'Xem phan tich KPI', 'qldl'],
  ['analytics.export', 'Xuat du lieu phan tich KPI', 'qldl'],
  ['reports.read', 'Tra cuu bao cao', 'qldl'],
  ['reports.export', 'Xuat bao cao tra cuu', 'qldl'],
  ['users.export', 'Import export tai khoan', 'admin'],
  ['audit.read', 'Xem nhat ky kiem toan', 'admin'],
] as const;

const ORG_ROWS = [
  ['XA-HDND', 'Hoi dong nhan dan (HDND)', 'XA-ROOT', 2],
  ['XA-HDND-BPC', 'Ban Phap che', 'XA-HDND', 3],
  ['XA-HDND-BKTXH', 'Ban Kinh te - Xa hoi', 'XA-HDND', 3],
  ['XA-UBND', 'Uy ban nhan dan (UBND)', 'XA-ROOT', 2],
  ['XA-VPH', 'Van phong HDND va UBND', 'XA-UBND', 3],
  ['XA-PVHXH', 'Phong Van hoa - Xa hoi', 'XA-UBND', 3],
  ['XA-TTPVHCC', 'Trung tam phuc vu hanh chinh cong', 'XA-UBND', 3],
] as const;

const ATTRS = [
  ['20000000-0000-0000-0000-000000000001', 'Nam truoc', 0, null],
  ['20000000-0000-0000-0000-000000000002', 'KH nam nay', 1, null],
  ['20000000-0000-0000-0000-000000000003', 'Thang 1', 2, null],
  ['20000000-0000-0000-0000-000000000004', 'Thang 2', 3, null],
  ['20000000-0000-0000-0000-000000000005', 'Thang 3', 4, null],
  ['20000000-0000-0000-0000-000000000006', 'Quy I', 5, null],
  ['20000000-0000-0000-0000-000000000007', 'Tong GTSP', 0, '20000000-0000-0000-0000-000000000006'],
] as const;

const INDS = [
  ['10000000-0000-0000-0000-000000000001', 'A', null, 'KINH TE', 0, null],
  ['10000000-0000-0000-0000-000000000002', 'I', null, 'TONG GIA TRI SAN PHAM TREN DIA BAN', 0, '10000000-0000-0000-0000-000000000001'],
  ['10000000-0000-0000-0000-000000000003', '1', '1', 'Toc do tang tong gia tri san pham', 0, '10000000-0000-0000-0000-000000000002'],
  ['10000000-0000-0000-0000-000000000004', '1.1', '1.1', 'Nong lam thuy san', 0, '10000000-0000-0000-0000-000000000003'],
  ['10000000-0000-0000-0000-000000000005', '1.2', '1.2', 'Cong nghiep - Xay dung', 1, '10000000-0000-0000-0000-000000000003'],
] as const;

export class V2SeedReference1862000002000 implements MigrationInterface {
  name = 'V2SeedReference1862000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    const hasColumn = async (table: string, column: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
        LIMIT 1
        `,
        [table, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    const orgHasCanAssignReports = await hasColumn('organizations', 'can_assign_reports');
    const attrHasCode = await hasColumn('form_template_attributes', 'code');

    for (const [code, name, category] of PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT INTO "permissions" ("code", "name", "category", "created_at", "updated_at")
          VALUES ($1, $2, $3, now(), now())
          ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "updated_at" = now()
        `,
        [code, name, category],
      );
    }

    await queryRunner.query(
      `
      INSERT INTO "roles" ("id", "code", "name", "description", "is_system", "created_at", "updated_at")
      VALUES ($1, 'SUPER_ADMIN', 'Sieu quan tri', 'Toan quyen cau hinh va van hanh', true, now(), now())
      ON CONFLICT ("code") DO NOTHING
      `,
      [IDS.adminRole],
    );

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."code" = 'SUPER_ADMIN'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);

    if (orgHasCanAssignReports) {
      await queryRunner.query(
        `
        INSERT INTO "organizations" ("id", "code", "name", "level", "can_assign_reports", "is_active", "description", "created_at", "updated_at")
        VALUES ($1, 'XA-ROOT', 'Chinh quyen cap xa (2 cap)', 1, true, true, 'Don vi goc seed cho cay to chuc', now(), now())
        ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = now()
        `,
        [IDS.rootOrg],
      );
    } else {
      await queryRunner.query(
        `
        INSERT INTO "organizations" ("id", "code", "name", "level", "is_active", "description", "created_at", "updated_at")
        VALUES ($1, 'XA-ROOT', 'Chinh quyen cap xa (2 cap)', 1, true, 'Don vi goc seed cho cay to chuc', now(), now())
        ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = now()
        `,
        [IDS.rootOrg],
      );
    }

    for (const [code, name, parentCode, level] of ORG_ROWS) {
      if (orgHasCanAssignReports) {
        await queryRunner.query(
          `
          INSERT INTO "organizations" ("code", "name", "parent_id", "level", "can_assign_reports", "is_active", "created_at", "updated_at")
          SELECT $1, $2, p."id", $3, true, true, now(), now()
          FROM "organizations" p
          WHERE p."code" = $4
          ON CONFLICT ("code") DO UPDATE SET
            "name" = EXCLUDED."name",
            "parent_id" = EXCLUDED."parent_id",
            "level" = EXCLUDED."level",
            "updated_at" = now()
          `,
          [code, name, level, parentCode],
        );
      } else {
        await queryRunner.query(
          `
          INSERT INTO "organizations" ("code", "name", "parent_id", "level", "is_active", "created_at", "updated_at")
          SELECT $1, $2, p."id", $3, true, now(), now()
          FROM "organizations" p
          WHERE p."code" = $4
          ON CONFLICT ("code") DO UPDATE SET
            "name" = EXCLUDED."name",
            "parent_id" = EXCLUDED."parent_id",
            "level" = EXCLUDED."level",
            "updated_at" = now()
          `,
          [code, name, level, parentCode],
        );
      }
    }

    await queryRunner.query(
      `
      INSERT INTO "users" ("id", "username", "email", "password_hash", "code", "full_name", "org_id", "status", "created_at", "updated_at")
      VALUES (
        $1,
        'admin',
        'admin@localhost.local',
        crypt($2, gen_salt('bf', 12)),
        'ADM001',
        'Quan tri vien',
        (SELECT "id" FROM "organizations" WHERE "code" = 'XA-ROOT' LIMIT 1),
        'active',
        now(),
        now()
      )
      ON CONFLICT ("username") DO NOTHING
      `,
      [IDS.adminUser, PASSWORD],
    );

    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role_id")
      SELECT u."id", r."id"
      FROM "users" u CROSS JOIN "roles" r
      WHERE u."username" = 'admin' AND r."code" = 'SUPER_ADMIN'
      ON CONFLICT ("user_id", "role_id") DO NOTHING
    `);

    await queryRunner.query(
      `
      INSERT INTO "field_categories" ("id", "code", "name", "description", "sort_order", "is_active", "created_at")
      VALUES ($1, 'KT-XH', 'Kinh te - Xa hoi', 'Danh muc linh vuc mau seed', 0, true, now())
      ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name"
      `,
      [IDS.fieldCategory],
    );

    await queryRunner.query(`
      INSERT INTO "form_templates" (
        "id", "code", "name", "template_status", "template_type", "period_type", "description", "field_category_id", "created_by", "created_at"
      )
      VALUES (
        '${IDS.template}',
        'MAU-01',
        'Bieu mau tong hop kinh te xa hoi',
        'READY',
        'AGGREGATE',
        'THANG',
        'Mau tham khao tu seed v1',
        '${IDS.fieldCategory}',
        (SELECT "id" FROM "users" WHERE "username" = 'admin' LIMIT 1),
        now()
      )
      ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = now()
    `);

    for (const [id, name, sortOrder, parentId] of ATTRS) {
      if (attrHasCode) {
        await queryRunner.query(
          `
          INSERT INTO "form_template_attributes" (
            "id", "template_id", "parent_id", "code", "name", "data_type", "sort_order", "created_at"
          ) VALUES ($1, $2, $3, $4, $5, 'number', $6, now())
          ON CONFLICT ("id") DO NOTHING
          `,
          [id, IDS.template, parentId, `ATTR-${sortOrder + 1}`, name, sortOrder],
        );
      } else {
        await queryRunner.query(
          `
          INSERT INTO "form_template_attributes" (
            "id", "template_id", "parent_id", "name", "data_type", "sort_order", "created_at"
          ) VALUES ($1, $2, $3, $4, 'number', $5, now())
          ON CONFLICT ("id") DO NOTHING
          `,
          [id, IDS.template, parentId, name, sortOrder],
        );
      }
    }

    for (const [id, code, displayIndex, name, sortOrder, parentId] of INDS) {
      await queryRunner.query(
        `
        INSERT INTO "form_template_indicators" (
          "id", "template_id", "parent_id", "display_index", "code", "name", "data_type", "sort_order", "is_required", "is_calculated", "created_at"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'number', $7, true, false, now())
        ON CONFLICT ("id") DO NOTHING
        `,
        [id, IDS.template, parentId, displayIndex, code, name, sortOrder],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "user_roles" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "username" = 'admin')`);
    await queryRunner.query(`DELETE FROM "users" WHERE "username" = 'admin'`);

    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "role_id" IN (SELECT "id" FROM "roles" WHERE "code" = 'SUPER_ADMIN')`);
    await queryRunner.query(`DELETE FROM "roles" WHERE "code" = 'SUPER_ADMIN'`);

    await queryRunner.query(`DELETE FROM "permissions" WHERE "code" IN (
      'users.manage','roles.manage','orgs.manage','forms.manage','assignments.manage','submissions.manage',
      'approvals.manage','summaries.manage','analytics.read','analytics.export','reports.read','reports.export',
      'users.export','audit.read'
    )`);

    await queryRunner.query(`DELETE FROM "form_template_indicators" WHERE "template_id" = $1`, [IDS.template]);
    await queryRunner.query(`DELETE FROM "form_template_attributes" WHERE "template_id" = $1`, [IDS.template]);
    await queryRunner.query(`DELETE FROM "form_templates" WHERE "id" = $1`, [IDS.template]);
    await queryRunner.query(`DELETE FROM "field_categories" WHERE "id" = $1`, [IDS.fieldCategory]);

    await queryRunner.query(`
      DELETE FROM "organizations"
      WHERE "code" IN ('XA-TTPVHCC','XA-PVHXH','XA-VPH','XA-UBND','XA-HDND-BKTXH','XA-HDND-BPC','XA-HDND','XA-ROOT')
    `);
  }
}
