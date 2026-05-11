import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not found');
    return;
  }

  const u = new URL(databaseUrl);
  const dbName = u.pathname?.replace(/^\//, '') || 'postgres';

  const ds = new DataSource({
    type: 'postgres',
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: dbName,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await ds.initialize();
    console.log('Connected to DB');

    await ds.query(`
      CREATE TABLE IF NOT EXISTS "submission_flow_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "submission_id" uuid NOT NULL,
        "event" character varying NOT NULL,
        "from_status" character varying(50),
        "to_status" character varying(50) NOT NULL,
        "snapshot" jsonb,
        "actor_id" uuid NOT NULL,
        "note" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_submission_flow_logs" PRIMARY KEY ("id")
      )
    `);
    console.log('Table submission_flow_logs created or already exists');
    
    // Also drop the old approval_history if it exists (optional, but requested earlier)
    // await ds.query(`DROP TABLE IF EXISTS "approval_history"`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await ds.destroy();
  }
}

run();
