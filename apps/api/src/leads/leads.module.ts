import { Module } from '@nestjs/common';
import { LeadIngestionController } from './lead-ingestion.controller';
import { LeadIngestionService } from './lead-ingestion.service';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController, LeadIngestionController],
  providers: [LeadsService, LeadIngestionService],
  exports: [LeadsService, LeadIngestionService],
})
export class LeadsModule {}
