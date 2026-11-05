import { createAdaptedVideoPlan } from './shared.js';

/** Adapt parseShopVideoResponse() output and retain the Product block. */
export function adaptShopVideoPlan(parsedPlan) {
  return createAdaptedVideoPlan({
    studioId: 'shop',
    source: parsedPlan,
    product: parsedPlan && parsedPlan.product ? parsedPlan.product : null,
  });
}
