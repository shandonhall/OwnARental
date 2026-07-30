import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ContractStatus,
  EndOfTermStage,
  LedgerEntryStatus,
  LedgerEntryType,
  VehicleStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { termProgress } from '../finance/finance.utils';
import {
  END_OF_TERM_COLUMNS,
  type UpdateEndOfTermStageDto,
} from './pipeline.schemas';

const END_OF_TERM_DAYS = 90;

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getEndOfTermBoard() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + END_OF_TERM_DAYS);

    const contracts = await this.prisma.contract.findMany({
      where: {
        OR: [
          {
            status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
            endDate: { gte: startOfToday, lte: horizon },
          },
          {
            endOfTermStage: {
              in: [
                EndOfTermStage.CONTACTED,
                EndOfTermStage.BALLOON_PENDING,
                EndOfTermStage.HANDOVER,
                EndOfTermStage.RETURNED,
              ],
            },
          },
        ],
      },
      include: {
        client: true,
        vehicle: true,
        ledger: true,
      },
      orderBy: { endDate: 'asc' },
    });

    for (const contract of contracts) {
      const progress = termProgress(contract);
      const suggested = suggestStage(contract, progress);
      if (contract.endOfTermStage !== suggested) {
        await this.prisma.contract.update({
          where: { id: contract.id },
          data: { endOfTermStage: suggested },
        });
        contract.endOfTermStage = suggested;
      }
    }

    const cards = contracts.map((contract) => {
      const progress = termProgress(contract);
      const balloonPaid = contract.ledger.some(
        (entry) =>
          entry.type === LedgerEntryType.BALLOON_PAYMENT &&
          entry.status !== LedgerEntryStatus.PENDING &&
          entry.status !== LedgerEntryStatus.FAILED &&
          entry.status !== LedgerEntryStatus.VOID,
      );

      return {
        id: contract.id,
        stage: contract.endOfTermStage ?? EndOfTermStage.FINAL_90,
        planType: contract.planType,
        status: contract.status,
        endDate: contract.endDate.toISOString(),
        balloonAmount:
          contract.balloonAmount != null
            ? Number(contract.balloonAmount).toFixed(2)
            : null,
        balloonPaid,
        ghlOpportunityId: contract.ghlOpportunityId,
        endOfTermNotifiedAt:
          contract.endOfTermNotifiedAt?.toISOString() ?? null,
        termProgress: progress,
        href: `/contracts/${contract.id}`,
        client: {
          id: contract.client.id,
          firstName: contract.client.firstName,
          lastName: contract.client.lastName,
          phone: contract.client.phone,
        },
        vehicle: {
          id: contract.vehicle.id,
          registration: contract.vehicle.registration,
          make: contract.vehicle.make,
          model: contract.vehicle.model,
          status: contract.vehicle.status,
        },
      };
    });

    const columns = END_OF_TERM_COLUMNS.map((stage) => ({
      stage,
      label: stageLabel(stage),
      cards: cards.filter((card) => card.stage === stage),
    }));

    return {
      generatedAt: now.toISOString(),
      total: cards.length,
      columns,
    };
  }

  async updateStage(contractId: string, body: UpdateEndOfTermStageDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { vehicle: true },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.contract.update({
        where: { id: contractId },
        data: { endOfTermStage: body.stage },
        include: {
          client: true,
          vehicle: true,
          ledger: true,
        },
      });

      if (body.stage === EndOfTermStage.RETURNED) {
        await tx.vehicle.update({
          where: { id: contract.vehicleId },
          data: { status: VehicleStatus.RETURNED },
        });
      }

      if (
        body.stage === EndOfTermStage.HANDOVER &&
        contract.status === ContractStatus.ACTIVE
      ) {
        // Keep contract active until staff marks COMPLETED after balloon/transfer.
      }

      return next;
    });

    const progress = termProgress(updated);
    return {
      id: updated.id,
      stage: updated.endOfTermStage,
      termProgress: progress,
      href: `/contracts/${updated.id}`,
      client: {
        id: updated.client.id,
        firstName: updated.client.firstName,
        lastName: updated.client.lastName,
      },
      vehicle: {
        id: updated.vehicle.id,
        registration: updated.vehicle.registration,
      },
    };
  }
}

function stageLabel(stage: EndOfTermStage) {
  switch (stage) {
    case EndOfTermStage.FINAL_90:
      return 'Final 90 days';
    case EndOfTermStage.CONTACTED:
      return 'Contacted';
    case EndOfTermStage.BALLOON_PENDING:
      return 'Balloon pending';
    case EndOfTermStage.HANDOVER:
      return 'Handover';
    case EndOfTermStage.RETURNED:
      return 'Returned';
    default:
      return stage;
  }
}

function suggestStage(
  contract: {
    endOfTermStage: EndOfTermStage | null;
    endOfTermNotifiedAt: Date | null;
    ghlOpportunityId: string | null;
    balloonAmount: { toString(): string } | null;
    ledger: Array<{ type: LedgerEntryType; status: LedgerEntryStatus }>;
    vehicle: { status: VehicleStatus };
  },
  progress: { isFinalNinetyDays: boolean },
): EndOfTermStage {
  if (contract.endOfTermStage === EndOfTermStage.HANDOVER) {
    return EndOfTermStage.HANDOVER;
  }
  if (
    contract.endOfTermStage === EndOfTermStage.RETURNED ||
    contract.vehicle.status === VehicleStatus.RETURNED
  ) {
    return EndOfTermStage.RETURNED;
  }
  if (contract.endOfTermStage === EndOfTermStage.BALLOON_PENDING) {
    return EndOfTermStage.BALLOON_PENDING;
  }
  if (contract.endOfTermStage === EndOfTermStage.CONTACTED) {
    return EndOfTermStage.CONTACTED;
  }

  const balloonPaid = contract.ledger.some(
    (entry) =>
      entry.type === LedgerEntryType.BALLOON_PAYMENT &&
      entry.status !== LedgerEntryStatus.PENDING &&
      entry.status !== LedgerEntryStatus.FAILED &&
      entry.status !== LedgerEntryStatus.VOID,
  );
  const hasBalloon =
    contract.balloonAmount != null && Number(contract.balloonAmount) > 0;

  if (contract.endOfTermNotifiedAt || contract.ghlOpportunityId) {
    if (hasBalloon && !balloonPaid) {
      return EndOfTermStage.BALLOON_PENDING;
    }
    return EndOfTermStage.CONTACTED;
  }

  return EndOfTermStage.FINAL_90;
}
