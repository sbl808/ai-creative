import { createAdaptedVideoPlan } from './shared.js';

/** Adapt parseShortVideoResponse() output without changing the legacy parser. */
export function adaptShortVideoPlan(parsedPlan) {
  return createAdaptedVideoPlan({
    studioId: 'short',
    source: parsedPlan,
  });
}
