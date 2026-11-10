import { createSrtStudioAdapter } from '../srt/index.js';

export function createContentSrtAdapter(engine) {
  return createSrtStudioAdapter('content', engine);
}

const contentSrtAdapter = createContentSrtAdapter();

export async function generateContentSrtShared(env, input) {
  return contentSrtAdapter.generate(env, input);
}
