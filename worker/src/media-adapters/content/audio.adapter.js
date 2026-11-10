import { createAudioStudioAdapter } from '../audio/index.js';

// Content retains its existing TTS input and WAV output shape.
const adapter = createAudioStudioAdapter('content');

export const createContentAudioAdapter = (engine) =>
  createAudioStudioAdapter('content', engine);

export const generateContentVoice = adapter.tts;
