import { createSrtStudioAdapter } from '../srt/index.js';

export function createSubtitleSrtAdapter(engine) {
  return createSrtStudioAdapter('subtitle', engine);
}

const subtitleSrtAdapter = createSubtitleSrtAdapter();

export async function generateSubtitleSrtShared(env, input) {
  return subtitleSrtAdapter.generate(env, input);
}
