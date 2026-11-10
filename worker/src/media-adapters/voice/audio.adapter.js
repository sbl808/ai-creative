import { createAudioStudioAdapter } from '../audio/index.js';

// Voice keeps TTS and transcription entry points separate from its CMS prompt.
const adapter = createAudioStudioAdapter('voice');

export const createVoiceAudioAdapter = (engine) =>
  createAudioStudioAdapter('voice', engine);

export const generateVoiceAudio = adapter.tts;
export const transcribeVoiceAudio = adapter.transcribe;
