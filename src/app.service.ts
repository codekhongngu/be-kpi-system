import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      const rows = await this.dataSource.query(
        'SELECT current_database() AS db, inet_server_addr() AS host, inet_server_port() AS port',
      );
      const row = rows?.[0];
      if (row?.db) {
        console.log(
          `[DB] db=${row.db} host=${row.host ?? 'unknown'} port=${row.port ?? 'unknown'}`,
        );
      }
    } catch (e) {
      console.log('[DB] unable to query current_database()');
    }
  }

  getHello(): string {
    return 'Hello World 1111!';
  }
}
