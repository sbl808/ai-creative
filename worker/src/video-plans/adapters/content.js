import { createAdaptedVideoPlan } from './shared.js';

/**
 * Adapt parseContentVideoResponse() output.
 * Legacy visualPrompt becomes the shared videoPrompt and visualDescription.
 * Character IDs are assigned by the shared adapter because Content's legacy
 * parser only returns name and description.
 */
export function adaptContentVideoPlan(parsedPlan) {
  return createAdaptedVideoPlan({
    studioId: 'content',
    source: parsedPlan,
  });
}
