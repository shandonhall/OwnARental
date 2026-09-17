import { BadRequestException } from '@nestjs/common';
import {
  applyLeadMark,
  assertForwardOrClose,
  isTerminalLeadStage,
} from './lead.workflow';

describe('Phase 2A lead workflow', () => {
  const base = {
    stage: 'NEW' as const,
    qualificationStatus: 'UNASSESSED' as const,
    firstAttemptAt: null,
    firstContactAt: null,
    now: new Date('2026-09-09T10:00:00Z'),
  };

  it('allows forward skip and rejects backward moves', () => {
    expect(() =>
      assertForwardOrClose('NEW', 'APPLICATION_SUBMITTED'),
    ).not.toThrow();
    expect(() => assertForwardOrClose('CONTACTED', 'NEW')).toThrow(
      BadRequestException,
    );
    expect(isTerminalLeadStage('CLOSED_WON')).toBe(true);
  });

  it('records attempt without advancing to CONTACTED', () => {
    const patch = applyLeadMark('attempt', {
      ...base,
      channel: 'PHONE',
    });
    expect(patch.firstAttemptAt).toEqual(base.now);
    expect(patch.firstAttemptChannel).toBe('PHONE');
    expect(patch.lastContactAt).toEqual(base.now);
    expect(patch.stage).toBeUndefined();
    expect(patch.firstContactAt).toBeUndefined();
  });

  it('mark contacted sets both timestamps when attempt missing', () => {
    const patch = applyLeadMark('contacted', {
      ...base,
      channel: 'WHATSAPP',
    });
    expect(patch.firstAttemptAt).toEqual(base.now);
    expect(patch.firstContactAt).toEqual(base.now);
    expect(patch.stage).toBe('CONTACTED');
  });

  it('preserves firstAttemptAt on successful contact', () => {
    const earlier = new Date('2026-09-09T09:00:00Z');
    const patch = applyLeadMark('contacted', {
      ...base,
      stage: 'NEW',
      firstAttemptAt: earlier,
      channel: 'EMAIL',
    });
    expect(patch.firstAttemptAt).toBeUndefined();
    expect(patch.firstContactAt).toEqual(base.now);
    expect(patch.stage).toBe('CONTACTED');
  });

  it('does not move later stages backward on contact', () => {
    const patch = applyLeadMark('contacted', {
      ...base,
      stage: 'QUALIFYING',
      firstAttemptAt: new Date('2026-09-08T10:00:00Z'),
      firstContactAt: new Date('2026-09-08T11:00:00Z'),
      channel: 'PHONE',
    });
    expect(patch.stage).toBeUndefined();
    expect(patch.firstContactAt).toBeUndefined();
    expect(patch.lastContactAt).toEqual(base.now);
  });

  it('requires disqualificationReason and lossReason', () => {
    expect(() => applyLeadMark('unqualify', base)).toThrow(BadRequestException);
    expect(() => applyLeadMark('close_lost', base)).toThrow(
      BadRequestException,
    );
    const lost = applyLeadMark('close_lost', {
      ...base,
      stage: 'QUALIFYING',
      qualificationStatus: 'QUALIFIED',
      lossReason: 'CUSTOMER_WITHDREW',
    });
    expect(lost.stage).toBe('CLOSED_LOST');
    expect(lost.lossReason).toBe('CUSTOMER_WITHDREW');
    expect(lost.qualificationStatus).toBeUndefined();
  });

  it('qualify advances early stages and clears disqualification', () => {
    const patch = applyLeadMark('qualify', base);
    expect(patch.qualificationStatus).toBe('QUALIFIED');
    expect(patch.stage).toBe('QUALIFYING');
    expect(patch.disqualificationReason).toBeNull();
  });

  it('documents_received sets timestamp only', () => {
    const patch = applyLeadMark('documents_received', {
      ...base,
      stage: 'DOCUMENTS_REQUESTED',
    });
    expect(patch.documentsReceivedAt).toEqual(base.now);
    expect(patch.stage).toBeUndefined();
  });
});
