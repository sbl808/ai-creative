// Subtitle Studio backend service.
// User audio and subtitle text are processed in memory only; never persist them here.

import { generateSubtitleSrtShared } from '../media-adapters/subtitle/srt.adapter.js';
import { translateSubtitleSrtShared } from '../media-adapters/subtitle/translation.adapter.js';

export async function generateSubtitleSrt(env, {
  audioBase64,
  mimeType = 'audio/mpeg',
  knownText = '',
  type = '2',
  plan = 'FREE',
  apiKey,
  model,
} = {}) {
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    throw new Error('missing_audio');
  }

  return generateSubtitleSrtShared(env, {
    audioBase64,
    mimeType,
    knownText,
    type: String(type || '2'),
    plan,
    apiKey,
    model,
  });
}

export async function translateSubtitleSrt(env, {
  srtText,
  direction = 'MY_TO_CN',
  type = '2',
  plan = 'FREE',
  apiKey,
  model,
} = {}) {
  if (!srtText || typeof srtText !== 'string' || !srtText.trim()) {
    throw new Error('missing_srt');
  }

  return translateSubtitleSrtShared(env, {
    srtText,
    direction,
    type: String(type || '2'),
    plan,
    apiKey,
    model,
  });
}
