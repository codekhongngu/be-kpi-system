import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { ExampleModule } from './modules/example/example.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { FormDesignerModule } from './modules/form-designer/form-designer.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { SummaryModule } from './modules/summary/summary.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { QueryModule } from './modules/query/query.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { FileModule } from './modules/file/file.module';
import { ImportJobModule } from './modules/import-job/import-job.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LoggingMiddleware, RequestIdMiddleware } from './common';
import { URL } from 'url';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const sslEnabled =
          configService.get<string>('DB_SSL', 'false') === 'true';
        const rejectUnauthorized =
          configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED', 'true') ===
          'true';

        if (databaseUrl) {
          const u = new URL(databaseUrl);
          const dbName = u.pathname?.replace(/^\//, '') || 'postgres';

          return {
            type: 'postgres' as const,
            host: u.hostname,
            port: u.port ? Number(u.port) : 5432,
            username: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            database: dbName,
            ssl: sslEnabled ? { rejectUnauthorized } : undefined,
            synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
            logging: configService.get<boolean>('DB_LOGGING', true),
            autoLoadEntities: true,
          };
        }

        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE', 'starter_db'),
          ssl: sslEnabled ? { rejectUnauthorized } : undefined,
          synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
          logging: configService.get<boolean>('DB_LOGGING', true),
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    RoleModule,
    FormDesignerModule,
    AssignmentModule,
    SubmissionModule,
    ApprovalModule,
    SummaryModule,
    MonitoringModule,
    QueryModule,
    NotificationModule,
    AnalyticsModule,
    OrganizationModule,
    ExampleModule,
    AuditLogModule,
    FileModule,
    ImportJobModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware to all routes
    consumer.apply(RequestIdMiddleware, LoggingMiddleware).forRoutes('*');
  }
}
