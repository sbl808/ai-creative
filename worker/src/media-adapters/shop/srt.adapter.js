import { createSrtStudioAdapter } from '../srt/index.js';

export function createShopSrtAdapter(engine) {
  return createSrtStudioAdapter('shop', engine);
}

const shopSrtAdapter = createShopSrtAdapter();

export async function generateShopSrtShared(env, input) {
  return shopSrtAdapter.generate(env, input);
}
