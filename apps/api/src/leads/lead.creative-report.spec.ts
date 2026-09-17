import { buildCreativeReport } from './lead.creative-report';

describe('Phase 2A creative report helpers', () => {
  it('aggregates VIDEO vs GRAPHIC funnel and medians', () => {
    const buckets = buildCreativeReport([
      {
        creativeType: 'VIDEO',
        qualificationStatus: 'QUALIFIED',
        stage: 'CLOSED_WON',
        sourceCreatedAt: new Date('2026-09-01T08:00:00Z'),
        createdAt: new Date('2026-09-01T08:05:00Z'),
        firstAttemptAt: new Date('2026-09-01T09:00:00Z'),
        firstContactAt: new Date('2026-09-01T10:00:00Z'),
      },
      {
        creativeType: 'VIDEO',
        qualificationStatus: 'UNQUALIFIED',
        stage: 'CLOSED_LOST',
        sourceCreatedAt: null,
        createdAt: new Date('2026-09-01T08:00:00Z'),
        firstAttemptAt: new Date('2026-09-01T12:00:00Z'),
        firstContactAt: null,
      },
      {
        creativeType: 'GRAPHIC',
        qualificationStatus: 'UNASSESSED',
        stage: 'NEW',
        sourceCreatedAt: new Date('2026-09-01T08:00:00Z'),
        createdAt: new Date('2026-09-01T08:00:00Z'),
        firstAttemptAt: null,
        firstContactAt: null,
      },
      {
        creativeType: 'GRAPHIC',
        qualificationStatus: 'QUALIFIED',
        stage: 'APPLICATION_SUBMITTED',
        sourceCreatedAt: new Date('2026-09-01T08:00:00Z'),
        createdAt: new Date('2026-09-01T08:00:00Z'),
        firstAttemptAt: new Date('2026-09-01T11:00:00Z'),
        firstContactAt: new Date('2026-09-01T14:00:00Z'),
      },
    ]);

    const video = buckets.find((b) => b.creativeType === 'VIDEO')!;
    const graphic = buckets.find((b) => b.creativeType === 'GRAPHIC')!;
    const unknown = buckets.find((b) => b.creativeType === 'UNKNOWN')!;

    expect(video.rawLeads).toBe(2);
    expect(video.qualified).toBe(1);
    expect(video.unqualified).toBe(1);
    expect(video.assessedQualificationRate).toBe(0.5);
    expect(video.closedWon).toBe(1);
    expect(video.closedLost).toBe(1);
    expect(video.responseBasisCounts.SOURCE).toBe(1);
    expect(video.responseBasisCounts.INGEST).toBe(1);
    expect(video.medianFirstAttemptHours).toBe(2.5);

    expect(graphic.rawLeads).toBe(2);
    expect(graphic.unassessed).toBe(1);
    expect(graphic.applicationSubmitted).toBe(1);
    expect(graphic.approved).toBe(0);
    expect(graphic.medianFirstContactHours).toBe(6);

    expect(unknown.rawLeads).toBe(0);
  });
});
