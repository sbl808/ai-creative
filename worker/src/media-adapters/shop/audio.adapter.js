import { createAudioStudioAdapter } from '../audio/index.js';

export function createShopAudioAdapter(engine) {
  return createAudioStudioAdapter('shop', engine);
}

const shopAudioAdapter = createShopAudioAdapter();

export async function generateShopAudioShared(env, input) {
  return shopAudioAdapter.tts(env, input);
}
