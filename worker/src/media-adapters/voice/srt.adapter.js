import { createSrtStudioAdapter } from '../srt/index.js';

export function createVoiceSrtAdapter(engine) {
  return createSrtStudioAdapter('voice', engine);
}

const voiceSrtAdapter = createVoiceSrtAdapter();

export async function generateVoiceSrtShared(env, input) {
  return voiceSrtAdapter.generate(env, input);
}
