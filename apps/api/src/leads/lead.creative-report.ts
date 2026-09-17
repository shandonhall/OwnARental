import {
  LEAD_CREATIVE_TYPES,
  type LeadCreativeTypeValue,
  type LeadQualificationStatusValue,
  type LeadStageValue,
} from './lead.constants';
import {
  firstAttemptResponseMs,
  firstContactResponseMs,
  medianNumber,
  msToHours,
  responseBasisFor,
  type LeadTimingRow,
  type ResponseBasis,
} from './lead.response-time';

export type CreativeReportLead = LeadTimingRow & {
  creativeType: LeadCreativeTypeValue;
  qualificationStatus: LeadQualificationStatusValue;
  stage: LeadStageValue;
  /** Stages this lead has entered (from history + current). */
  reachedStages?: readonly LeadStageValue[];
};

export type CreativeReportBucket = {
  creativeType: LeadCreativeTypeValue;
  rawLeads: number;
  unassessed: number;
  qualified: number;
  unqualified: number;
  /** QUALIFIED / (QUALIFIED + UNQUALIFIED); null when none assessed. */
  assessedQualificationRate: number | null;
  applicationSubmitted: number;
  approved: number;
  closedWon: number;
  closedLost: number;
  medianFirstAttemptHours: number | null;
  medianFirstContactHours: number | null;
  responseBasisCounts: Record<ResponseBasis, number>;
};

function emptyBucket(
  creativeType: LeadCreativeTypeValue,
): CreativeReportBucket {
  return {
    creativeType,
    rawLeads: 0,
    unassessed: 0,
    qualified: 0,
    unqualified: 0,
    assessedQualificationRate: null,
    applicationSubmitted: 0,
    approved: 0,
    closedWon: 0,
    closedLost: 0,
    medianFirstAttemptHours: null,
    medianFirstContactHours: null,
    responseBasisCounts: { SOURCE: 0, INGEST: 0 },
  };
}

const FUNNEL_STAGES: LeadStageValue[] = [
  'APPLICATION_SUBMITTED',
  'APPROVED',
  'VEHICLE_SELECTED',
  'CLOSED_WON',
];

function reachedOrPast(
  lead: CreativeReportLead,
  milestone: LeadStageValue,
): boolean {
  if (lead.reachedStages && lead.reachedStages.length > 0) {
    return lead.reachedStages.includes(milestone);
  }
  const order: LeadStageValue[] = [
    'NEW',
    'CONTACTED',
    'QUALIFYING',
    'DOCUMENTS_REQUESTED',
    'APPLICATION_SUBMITTED',
    'APPROVED',
    'VEHICLE_SELECTED',
    'CLOSED_WON',
  ];
  if (lead.stage === 'CLOSED_LOST') {
    return false;
  }
  const a = order.indexOf(lead.stage);
  const b = order.indexOf(milestone);
  if (a < 0 || b < 0) return false;
  return a >= b;
}

export function buildCreativeReport(
  leads: readonly CreativeReportLead[],
): CreativeReportBucket[] {
  const buckets = new Map<LeadCreativeTypeValue, CreativeReportBucket>();
  const attemptSamples = new Map<LeadCreativeTypeValue, number[]>();
  const contactSamples = new Map<LeadCreativeTypeValue, number[]>();

  for (const type of LEAD_CREATIVE_TYPES) {
    buckets.set(type, emptyBucket(type));
    attemptSamples.set(type, []);
    contactSamples.set(type, []);
  }

  for (const lead of leads) {
    const bucket =
      buckets.get(lead.creativeType) ?? emptyBucket(lead.creativeType);
    buckets.set(lead.creativeType, bucket);

    bucket.rawLeads += 1;
    bucket.responseBasisCounts[responseBasisFor(lead)] += 1;

    if (lead.qualificationStatus === 'UNASSESSED') bucket.unassessed += 1;
    if (lead.qualificationStatus === 'QUALIFIED') bucket.qualified += 1;
    if (lead.qualificationStatus === 'UNQUALIFIED') bucket.unqualified += 1;

    if (reachedOrPast(lead, 'APPLICATION_SUBMITTED')) {
      bucket.applicationSubmitted += 1;
    }
    if (reachedOrPast(lead, 'APPROVED')) {
      bucket.approved += 1;
    }
    if (lead.stage === 'CLOSED_WON') bucket.closedWon += 1;
    if (lead.stage === 'CLOSED_LOST') bucket.closedLost += 1;

    const attemptMs = firstAttemptResponseMs(lead);
    if (attemptMs != null) {
      const samples = attemptSamples.get(lead.creativeType);
      if (samples) samples.push(attemptMs);
    }
    const contactMs = firstContactResponseMs(lead);
    if (contactMs != null) {
      const samples = contactSamples.get(lead.creativeType);
      if (samples) samples.push(contactMs);
    }
  }

  for (const type of LEAD_CREATIVE_TYPES) {
    const bucket = buckets.get(type)!;
    const assessed = bucket.qualified + bucket.unqualified;
    bucket.assessedQualificationRate =
      assessed === 0
        ? null
        : Math.round((bucket.qualified / assessed) * 1000) / 1000;
    bucket.medianFirstAttemptHours = msToHours(
      medianNumber(attemptSamples.get(type) ?? []),
    );
    bucket.medianFirstContactHours = msToHours(
      medianNumber(contactSamples.get(type) ?? []),
    );
  }

  void FUNNEL_STAGES;
  return LEAD_CREATIVE_TYPES.map((type) => buckets.get(type)!);
}
