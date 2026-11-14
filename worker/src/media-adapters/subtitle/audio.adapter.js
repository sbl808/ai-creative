import { createAudioStudioAdapter } from '../audio/index.js';

// Subtitle owns transcription only; TTS is intentionally not exported.
export function createSubtitleAudioAdapter(engine) {
  const adapter = createAudioStudioAdapter('subtitle', engine);
  return {
    transcribe: adapter.transcribe,
  };
}

const subtitleAudioAdapter = createSubtitleAudioAdapter();

export async function transcribeSubtitleAudio(env, input) {
  return subtitleAudioAdapter.transcribe(env, input);
}
