import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import * as mysql from 'mysql2/promise';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private readonly pool: mysql.Pool;
  private readonly logger = new Logger(DrizzleService.name);
  public readonly db: MySql2Database<typeof schema>;

  constructor(configService: ConfigService) {
    const user = configService.get<string>('MYSQL_USER') || 'root';
    const password = configService.get<string>('MYSQL_PASSWORD') || '';
    const host = configService.get<string>('MYSQL_HOST') || 'localhost';
    const port = Number(configService.get<number>('MYSQL_PORT')) || 3306;
    const database = configService.get<string>('MYSQL_DB') || 'iotdb';

    this.pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: Number(configService.get<number>('DB_POOL_SIZE')) || 10,
      idleTimeout: 10000,
      connectTimeout: 5000,
      enableKeepAlive: true,
      timezone: 'Z',
    });

    this.pool.on('connection', () => {
      this.logger.debug('[MySQL] New connection created');
    });

    this.db = drizzle(this.pool, {
      schema,
      mode: 'default',
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  get query() { return this.db.query; }
  select(...args: any[]) { return (this.db.select as any)(...args); }
  insert(table: any) { return this.db.insert(table); }
  update(table: any) { return this.db.update(table); }
  delete(table: any) { return this.db.delete(table); }
  execute(query: any) { return this.db.execute(query); }
  transaction(fn: any) { return this.db.transaction(fn); }
}

