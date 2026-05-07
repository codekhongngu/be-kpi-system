import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { TemplateManagementModule } from './modules/template-management/form-designer.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { ReportCampaignModule } from './modules/report-campaign/report-campaign.module';
import { SummaryAnalyticsModule } from './modules/summary-analytics/summary-analytics.module';
import { LoggingMiddleware, RequestIdMiddleware } from './common';
import { URL } from 'url';

function envBool(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

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
          envBool(configService.get<string>('DB_SSL'), false);
        const rejectUnauthorized =
          envBool(
            configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED'),
            true,
          );
        const synchronize = envBool(
          configService.get<string>('DB_SYNCHRONIZE'),
          false,
        );
        const logging = envBool(configService.get<string>('DB_LOGGING'), true);

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
            synchronize,
            logging,
            autoLoadEntities: true,
          };
        }

        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE', 'db_commune_tuyphuoc_v2'),
          ssl: sslEnabled ? { rejectUnauthorized } : undefined,
          synchronize,
          logging,
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    RoleModule,
    TemplateManagementModule,
    SubmissionModule,
    ApprovalModule,
    SummaryAnalyticsModule,
    OrganizationModule,
    AuditLogModule,
    ReportCampaignModule,
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

