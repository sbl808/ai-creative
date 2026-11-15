import {
  AUDIO_CONTRACT_VERSION,
  validateAudioRequestV1,
  validateAudioResponseV1,
} from '../contracts/audio.contract.js';
import { resolveModel } from '../../core/aiModels.js';
import { generateSpeech, generateMultimodal } from '../../core/ai/aiService.js';
import { pcmToWavBase64 } from '../../core/utilities.js';

const AUDIO_TASK_BY_STUDIO = Object.freeze({
  content: Object.freeze({ tts: 'content.voice' }),
  voice: Object.freeze({
    tts: 'voice.voice',
    transcribe: 'voice.transcribe',
  }),
  // Shop preserves the current Voice TTS model task while owning its adapter/API.
  shop: Object.freeze({ tts: 'voice.voice' }),
  subtitle: Object.freeze({ transcribe: 'subtitle.transcribe' }),
});

function createSafeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

/**
 * Shared Audio executor.
 *
 * The versioned request contains Studio input only. API credentials, plan and
 * selected model are supplied separately through executionContext and are
 * never copied into the contract or returned in the response.
 *
 * Current route-backed capabilities:
 * - Content: TTS
 * - Voice: TTS and audio transcription
 * - Subtitle: audio transcription
 *
 * Studio-specific prompts and workflows remain in their Studio modules.
 */
export function createSharedAudioEngine(services = {}) {
  const resolveModelFn = services.resolveModel || resolveModel;
  const generateSpeechFn = services.generateSpeech || generateSpeech;
  const generateMultimodalFn = services.generateMultimodal || generateMultimodal;
  const pcmToWavBase64Fn = services.pcmToWavBase64 || pcmToWavBase64;

  return async function generateSharedAudio(env, request, executionContext = {}) {
    const validation = validateAudioRequestV1(request);
    if (!validation.ok) throw createSafeError('invalid_audio_request');

    const task = AUDIO_TASK_BY_STUDIO[request.studioId]?.[request.operation];
    if (!task) throw createSafeError('unsupported_shared_audio_capability');

    // Browser BYOK is required for this shared engine. Do not fall back to
    // an environment key or retrieve a stored key from D1.
    const apiKey = String(executionContext.apiKey || '').trim();
    if (!apiKey) throw createSafeError('missing_api_key');

    const plan = executionContext.plan;
    const selectedModel = executionContext.model;
    let result;

    if (request.operation === 'tts') {
      const model = await resolveModelFn(
        env,
        'voice',
        plan,
        selectedModel,
        task,
      );
      const audio = await generateSpeechFn(env, {
        model,
        task,
        text: String(request.input.text).trim(),
        voiceName: request.input.voiceName || 'Kore',
        apiKey,
      });

      const wavBase64 = pcmToWavBase64Fn(audio?.data, 24000, 1, 16);
      result = {
        data: wavBase64,
        mimeType: 'audio/wav',
      };
    } else {
      const model = await resolveModelFn(
        env,
        'transcribe',
        plan,
        selectedModel,
        task,
      );
      const text = await generateMultimodalFn(env, {
        model,
        task,
        // Studio Brain/CMS may supply its own transcription instruction without
        // moving Studio-specific prompt logic into the shared engine.
        prompt: String(executionContext.prompt || 'အောက်က Audio ကို Text အဖြစ် တိကျစွာ Transcribe လုပ်ပါ။ Transcribe လုပ်ထားသော Text ကိုသာ ပြန်ပေးပါ။'),
        images: [{
          mimeType: request.input.mimeType || 'audio/mpeg',
          base64: request.input.audioBase64,
        }],
        apiKey,
      });
      result = { text };
    }

    const response = {
      contractVersion: AUDIO_CONTRACT_VERSION,
      studioId: request.studioId,
      operation: request.operation,
      result,
    };
    const responseValidation = validateAudioResponseV1(response);
    if (!responseValidation.ok) {
      throw createSafeError('invalid_audio_provider_response');
    }

    return response;
  };
}

export const generateSharedAudio = createSharedAudioEngine();
