import { validateVideoPlanV1 } from './contracts/video-plan.v1.js';
import { adaptStoryVideoPlan } from './adapters/story.js';
import { adaptContentVideoPlan } from './adapters/content.js';
import { adaptShortVideoPlan } from './adapters/short.js';
import { adaptShopVideoPlan } from './adapters/shop.js';

const ADAPTERS = Object.freeze({
  story: adaptStoryVideoPlan,
  content: adaptContentVideoPlan,
  short: adaptShortVideoPlan,
  shop: adaptShopVideoPlan,
});

export class VideoPlanEngineError extends Error {
  constructor(code, details = []) {
    super(code);
    this.name = 'VideoPlanEngineError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Assert that a value conforms to Shared Video Plan v1.
 * Only stable validation codes are attached; plan content is never included.
 */
export function assertValidVideoPlan(plan) {
  const result = validateVideoPlanV1(plan);
  if (!result.ok) {
    throw new VideoPlanEngineError('invalid_video_plan', result.errors);
  }
  return plan;
}

/**
 * Run one existing Studio generator and normalize its parser output.
 *
 * Pass generate as a closure so the engine stays independent of env, AI,
 * CMS, routes, authentication and Studio-specific generator arguments.
 * Generator exceptions intentionally propagate unchanged to the caller.
 */
export async function generateVideoPlan({ studioId, generate } = {}) {
  const adapt = ADAPTERS[studioId];
  if (!adapt) {
    throw new VideoPlanEngineError('unsupported_studio');
  }
  if (typeof generate !== 'function') {
    throw new VideoPlanEngineError('generator_required');
  }

  const parsedPlan = await generate();
  let normalizedPlan;
  try {
    normalizedPlan = adapt(parsedPlan);
  } catch {
    throw new VideoPlanEngineError('invalid_video_plan');
  }

  return assertValidVideoPlan(normalizedPlan);
}
