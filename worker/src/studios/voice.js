// AI Creative Studio — Voice Studio Backend
// Voice Studio သည် Text → Voice (TTS) ကိုသာ တာဝန်ယူသည်။

import { generateVoiceAudio as generateSharedVoiceAudio } from '../media-adapters/voice/audio.adapter.js';

// Text → Voice (TTS)
export async function generateVoiceAudio(env, { text, voiceName, apiKey, model, plan }) {
  if (!text || !String(text).trim()) throw new Error('missing_text');
  return generateSharedVoiceAudio(env, { text, voiceName, apiKey, model, plan });
}
