import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ContractsModule } from './contracts/contracts.module';
import { LedgerModule } from './ledger/ledger.module';
import { TelematicsModule } from './telematics/telematics.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GhlModule } from './ghl/ghl.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { FinesModule } from './fines/fines.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LeadsModule } from './leads/leads.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '../../prisma/.env'),
        resolve(process.cwd(), 'prisma/.env'),
        resolve(process.cwd(), '.env'),
      ],
    }),
    PrismaModule,
    AuthModule,
    ClientsModule,
    VehiclesModule,
    ContractsModule,
    LedgerModule,
    TelematicsModule,
    SearchModule,
    NotificationsModule,
    GhlModule,
    PipelineModule,
    FinesModule,
    DashboardModule,
    LeadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
