import { TRANSLATION_CONTRACT_VERSION } from '../../media-production/contracts/translation.contract.js';
import { translateSharedSrt } from '../../media-production/translation/engine.js';
import { buildSubtitleTranslationPrompt } from '../../studios/subtitle/prompts.js';

function normalizeDirection(direction) {
  const value = String(direction || 'MY_TO_CN').trim().replace(/-/g, '_').toUpperCase();
  return value === 'CN_TO_MY' ? 'CN_TO_MY' : 'MY_TO_CN';
}

export async function translateSubtitleSrtShared(env, input = {}) {
  const srtText = String(input.srtText || '').trim();
  if (!srtText) throw new Error('missing_srt');

  const direction = normalizeDirection(input.direction);
  const prompt = await buildSubtitleTranslationPrompt(env, {
    srtText,
    direction,
    plan: input.plan || 'PRO',
    type: String(input.type || '2'),
  });

  const response = await translateSharedSrt(env, {
    contractVersion: TRANSLATION_CONTRACT_VERSION,
    studioId: 'subtitle',
    operation: 'translate-srt',
    input: {
      srtText,
      direction,
      ...(input.model ? { model: input.model } : {}),
      ...(input.type ? { type: input.type } : {}),
    },
  }, {
    apiKey: input.apiKey,
    model: input.model,
    plan: input.plan,
    prompt,
  });

  return { srt: response.result.srt };
}
