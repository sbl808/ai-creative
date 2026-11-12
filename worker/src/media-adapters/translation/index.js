import { TRANSLATION_CONTRACT_VERSION } from '../../media-production/contracts/translation.contract.js';
import { translateSharedSrt } from '../../media-production/translation/engine.js';

const STUDIO_IDS = Object.freeze(['content', 'voice', 'shop']);

export function normalizeTranslationDirection(direction, fallback = 'MY_TO_CN') {
  const value = String(direction || fallback).trim().replace(/-/g, '_').toUpperCase();
  return value === 'MY_TO_CN' ? 'MY_TO_CN' : 'CN_TO_MY';
}

/**
 * Build a Studio adapter for shared SRT translation.
 * Studio prompts and credentials remain outside the versioned contract.
 */
export function createTranslationStudioAdapter(studioId, {
  engine = translateSharedSrt,
  buildPrompt,
  defaultDirection = 'MY_TO_CN',
  resolvePlan = (input) => input.plan,
} = {}) {
  if (!STUDIO_IDS.includes(studioId)) {
    throw new Error('unsupported_translation_adapter_studio');
  }
  if (typeof buildPrompt !== 'function') {
    throw new Error('translation_prompt_builder_required');
  }

  return {
    async translate(env, input = {}) {
      const srtText = String(input.srtText || '').trim();
      if (!srtText) throw new Error('missing_srt');

      const direction = normalizeTranslationDirection(input.direction, defaultDirection);
      const prompt = buildPrompt(srtText, direction);
      const response = await engine(env, {
        contractVersion: TRANSLATION_CONTRACT_VERSION,
        studioId,
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
        plan: resolvePlan(input),
        prompt,
      });

      return { srt: response.result.srt };
    },
  };
}
