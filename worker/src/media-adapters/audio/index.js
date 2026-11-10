import { AUDIO_CONTRACT_VERSION } from '../../media-production/contracts/audio.contract.js';
import { generateSharedAudio } from '../../media-production/audio/engine.js';

/**
 * Build a Studio adapter while keeping provider credentials and execution
 * settings outside the versioned media contract.
 */
export function createAudioStudioAdapter(studioId, engine = generateSharedAudio) {
  if (!['content', 'voice'].includes(studioId)) {
    throw new Error('unsupported_audio_adapter_studio');
  }

  async function execute(operation, input, context = {}) {
    return engine({
      ...context.env,
    }, {
      contractVersion: AUDIO_CONTRACT_VERSION,
      studioId,
      operation,
      input,
    }, {
      apiKey: context.apiKey,
      model: context.model,
      plan: context.plan,
      prompt: context.prompt,
    });
  }

  return {
    async tts(env, { text, voiceName, apiKey, model, plan } = {}) {
      const response = await execute('tts', {
        text,
        ...(voiceName ? { voiceName } : {}),
      }, { env, apiKey, model, plan });
      return {
        data: response.result.data,
        mimeType: response.result.mimeType,
      };
    },

    async transcribe(env, {
      audioBase64,
      mimeType,
      apiKey,
      model,
      plan,
      prompt,
    } = {}) {
      if (studioId !== 'voice') {
        throw new Error('unsupported_audio_adapter_operation');
      }
      const response = await execute('transcribe', {
        audioBase64,
        ...(mimeType ? { mimeType } : {}),
      }, { env, apiKey, model, plan, prompt });
      return { text: response.result.text };
    },
  };
}
