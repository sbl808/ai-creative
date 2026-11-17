import { createAudioStudioAdapter } from '../audio/index.js';

// Subtitle owns a separate transcription adapter; Voice routes stay unchanged.
const adapter = createAudioStudioAdapter('subtitle');

export const createSubtitleAudioAdapter = (engine) =>
  createAudioStudioAdapter('subtitle', engine);

export const transcribeSubtitleAudio = adapter.transcribe;
