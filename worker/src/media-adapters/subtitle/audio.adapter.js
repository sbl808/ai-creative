import { createAudioStudioAdapter } from '../audio/index.js';

// Subtitle owns Audio → Text while reusing the shared audio engine.
const adapter = createAudioStudioAdapter('subtitle');

export const createSubtitleAudioAdapter = (engine) =>
  createAudioStudioAdapter('subtitle', engine);

export const transcribeSubtitleAudio = adapter.transcribe;
