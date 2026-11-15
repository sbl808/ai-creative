// AI Creative Studio — Voice Studio Backend
// Voice Studio owns Text-to-Voice (TTS) only.

import { generateVoiceAudio as generateSharedVoiceAudio } from '../media-adapters/voice/audio.adapter.js';

export async function generateVoiceAudio(env, { text, voiceName, apiKey, model, plan }) {
  if (!text || !String(text).trim()) throw new Error('missing_text');
  return generateSharedVoiceAudio(env, { text, voiceName, apiKey, model, plan });
}
