import { generateShopAudioShared } from '../../media-adapters/shop/audio.adapter.js';
import { generateShopSrtShared } from '../../media-adapters/shop/srt.adapter.js';
import { translateShopSrtShared } from '../../media-adapters/shop/translation.adapter.js';
import { buildVoiceSrtPrompt } from '../voice.js';

export async function generateShopAudio(env, input = {}) {
  if (!input.text || !String(input.text).trim()) throw new Error('missing_text');
  return generateShopAudioShared(env, input);
}

export async function generateShopSrt(env, input = {}) {
  if (!input.audioBase64) throw new Error('missing_audio');
  const prompt = await buildVoiceSrtPrompt(env, input.knownText);
  return generateShopSrtShared(env, {
    ...input,
    mimeType: input.mimeType || 'audio/mpeg',
    prompt,
  });
}

export async function translateShopSrt(env, input = {}) {
  if (!input.srtText || !String(input.srtText).trim()) throw new Error('missing_srt');
  return translateShopSrtShared(env, input);
}
