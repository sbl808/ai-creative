import { createSrtStudioAdapter } from '../srt/index.js';
import { buildSubtitleSrtPrompt } from '../../studios/subtitle/prompts.js';

const subtitleSrtAdapter = createSrtStudioAdapter('subtitle');

export async function generateSubtitleSrtShared(env, input = {}) {
  if (!input.audioBase64) throw new Error('missing_audio');
  const prompt = await buildSubtitleSrtPrompt(env, {
    plan: input.plan || 'PRO',
    type: String(input.type || '2'),
    knownText: input.knownText,
  });
  return subtitleSrtAdapter.generate(env, {
    ...input,
    mimeType: input.mimeType || 'audio/mpeg',
    prompt,
  });
}
