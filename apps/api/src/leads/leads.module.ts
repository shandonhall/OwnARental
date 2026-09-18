import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { WebhooksController } from '../webhooks/webhooks.controller';

@Module({
  imports: [ClientsModule],
  controllers: [LeadsController, WebhooksController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
