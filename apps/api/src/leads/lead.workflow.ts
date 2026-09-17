import { BadRequestException } from '@nestjs/common';
import {
  TERMINAL_LEAD_STAGES,
  type LeadContactChannelValue,
  type LeadDisqualificationReasonValue,
  type LeadLossReasonValue,
  type LeadQualificationStatusValue,
  type LeadStageValue,
} from './lead.constants';

export type LeadMark =
  | 'attempt'
  | 'contacted'
  | 'qualify'
  | 'unqualify'
  | 'request_documents'
  | 'documents_received'
  | 'advance'
  | 'close_won'
  | 'close_lost';

const STAGE_RANK: Record<LeadStageValue, number> = {
  NEW: 0,
  CONTACTED: 1,
  QUALIFYING: 2,
  DOCUMENTS_REQUESTED: 3,
  APPLICATION_SUBMITTED: 4,
  APPROVED: 5,
  VEHICLE_SELECTED: 6,
  CLOSED_WON: 7,
  CLOSED_LOST: 7,
};

export function isTerminalLeadStage(stage: LeadStageValue): boolean {
  return (TERMINAL_LEAD_STAGES as readonly string[]).includes(stage);
}

/** Forward-only (or close lost). Skipping ahead is allowed; backward is not. */
export function assertForwardOrClose(
  from: LeadStageValue,
  to: LeadStageValue,
): void {
  if (isTerminalLeadStage(from)) {
    throw new BadRequestException(
      `Cannot change workflow from terminal stage ${from}`,
    );
  }
  if (to === 'CLOSED_LOST' || to === 'CLOSED_WON') return;
  if (STAGE_RANK[to] < STAGE_RANK[from]) {
    throw new BadRequestException(
      `Cannot move lead backward from ${from} to ${to}`,
    );
  }
}

export type LeadMarkContext = {
  stage: LeadStageValue;
  qualificationStatus: LeadQualificationStatusValue;
  firstAttemptAt: Date | null;
  firstContactAt: Date | null;
  channel?: LeadContactChannelValue;
  disqualificationReason?: LeadDisqualificationReasonValue;
  disqualificationNotes?: string | null;
  lossReason?: LeadLossReasonValue;
  lossNotes?: string | null;
  advanceTo?: LeadStageValue;
  now?: Date;
};

export type LeadMarkResult = {
  stage?: LeadStageValue;
  qualificationStatus?: LeadQualificationStatusValue;
  disqualificationReason?: LeadDisqualificationReasonValue | null;
  disqualificationNotes?: string | null;
  lossReason?: LeadLossReasonValue | null;
  lossNotes?: string | null;
  firstAttemptAt?: Date;
  firstAttemptChannel?: LeadContactChannelValue;
  firstContactAt?: Date;
  firstContactChannel?: LeadContactChannelValue;
  lastContactAt?: Date;
  documentsReceivedAt?: Date;
  closedAt?: Date;
};

export function applyLeadMark(
  mark: LeadMark,
  ctx: LeadMarkContext,
): LeadMarkResult {
  const now = ctx.now ?? new Date();

  switch (mark) {
    case 'attempt': {
      if (!ctx.channel) {
        throw new BadRequestException('channel is required for attempt');
      }
      const patch: LeadMarkResult = { lastContactAt: now };
      if (!ctx.firstAttemptAt) {
        patch.firstAttemptAt = now;
        patch.firstAttemptChannel = ctx.channel;
      }
      return patch;
    }
    case 'contacted': {
      if (!ctx.channel) {
        throw new BadRequestException('channel is required for contacted');
      }
      const patch: LeadMarkResult = { lastContactAt: now };
      if (!ctx.firstAttemptAt) {
        patch.firstAttemptAt = now;
        patch.firstAttemptChannel = ctx.channel;
      }
      if (!ctx.firstContactAt) {
        patch.firstContactAt = now;
        patch.firstContactChannel = ctx.channel;
      }
      if (ctx.stage === 'NEW') {
        assertForwardOrClose(ctx.stage, 'CONTACTED');
        patch.stage = 'CONTACTED';
      }
      return patch;
    }
    case 'qualify': {
      const nextStage = stageAfterQualify(ctx.stage);
      return {
        qualificationStatus: 'QUALIFIED',
        disqualificationReason: null,
        disqualificationNotes: null,
        ...(nextStage ? { stage: nextStage } : {}),
      };
    }
    case 'unqualify': {
      if (!ctx.disqualificationReason) {
        throw new BadRequestException(
          'disqualificationReason is required for unqualify',
        );
      }
      return {
        qualificationStatus: 'UNQUALIFIED',
        disqualificationReason: ctx.disqualificationReason,
        disqualificationNotes: ctx.disqualificationNotes ?? null,
      };
    }
    case 'request_documents': {
      assertForwardOrClose(ctx.stage, 'DOCUMENTS_REQUESTED');
      return { stage: 'DOCUMENTS_REQUESTED' };
    }
    case 'documents_received':
      return { documentsReceivedAt: now };
    case 'advance': {
      if (!ctx.advanceTo) {
        throw new BadRequestException('advanceTo is required for advance');
      }
      if (isTerminalLeadStage(ctx.advanceTo)) {
        throw new BadRequestException(
          'Use close_won / close_lost to terminate a lead',
        );
      }
      assertForwardOrClose(ctx.stage, ctx.advanceTo);
      return { stage: ctx.advanceTo };
    }
    case 'close_won': {
      assertForwardOrClose(ctx.stage, 'CLOSED_WON');
      return {
        stage: 'CLOSED_WON',
        closedAt: now,
        lossReason: null,
        lossNotes: null,
      };
    }
    case 'close_lost': {
      if (!ctx.lossReason) {
        throw new BadRequestException('lossReason is required for close_lost');
      }
      assertForwardOrClose(ctx.stage, 'CLOSED_LOST');
      return {
        stage: 'CLOSED_LOST',
        closedAt: now,
        lossReason: ctx.lossReason,
        lossNotes: ctx.lossNotes ?? null,
      };
    }
    default: {
      const _exhaustive: never = mark;
      void _exhaustive;
      throw new BadRequestException(`Unknown mark ${String(mark)}`);
    }
  }
}

/** When qualify advances NEW/CONTACTED → QUALIFYING, validate forward. */
export function stageAfterQualify(from: LeadStageValue): LeadStageValue | null {
  if (from === 'NEW' || from === 'CONTACTED') {
    assertForwardOrClose(from, 'QUALIFYING');
    return 'QUALIFYING';
  }
  return null;
}
