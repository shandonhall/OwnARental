import { z } from 'zod';
import { EndOfTermStage } from '../generated/prisma/enums';

export const updateEndOfTermStageSchema = z.object({
  stage: z.nativeEnum(EndOfTermStage),
});

export type UpdateEndOfTermStageDto = z.infer<
  typeof updateEndOfTermStageSchema
>;

export const END_OF_TERM_COLUMNS: EndOfTermStage[] = [
  EndOfTermStage.FINAL_90,
  EndOfTermStage.CONTACTED,
  EndOfTermStage.BALLOON_PENDING,
  EndOfTermStage.HANDOVER,
  EndOfTermStage.RETURNED,
];
