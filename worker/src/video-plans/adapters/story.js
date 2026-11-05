import { createAdaptedVideoPlan } from './shared.js';

/** Adapt parseStoryVideoResponse() output without changing the legacy parser. */
export function adaptStoryVideoPlan(parsedPlan) {
  return createAdaptedVideoPlan({
    studioId: 'story',
    source: parsedPlan,
  });
}
