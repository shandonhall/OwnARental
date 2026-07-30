import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { ContractsModule } from '../contracts/contracts.module';
import { GhlModule } from '../ghl/ghl.module';

@Module({
  imports: [ContractsModule, GhlModule],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
