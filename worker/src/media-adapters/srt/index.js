import { SRT_CONTRACT_VERSION } from '../../media-production/contracts/srt.contract.js';
import { generateSharedSrt } from '../../media-production/srt/engine.js';

/**
 * Build a Studio adapter for the shared Audio -> SRT capability.
 * Studio-specific prompts and credentials stay outside the versioned contract.
 */
export function createSrtStudioAdapter(studioId, engine = generateSharedSrt) {
  if (!['content', 'voice', 'shop'].includes(studioId)) {
    throw new Error('unsupported_srt_adapter_studio');
  }

  return {
    async generate(env, {
      audioBase64,
      mimeType,
      apiKey,
      model,
      plan,
      prompt,
    } = {}) {
      const response = await engine(env, {
        contractVersion: SRT_CONTRACT_VERSION,
        studioId,
        operation: 'audio-to-srt',
        input: {
          audioBase64,
          ...(mimeType ? { mimeType } : {}),
        },
      }, {
        apiKey,
        model,
        plan,
        prompt,
      });

      return { srt: response.result.srt };
    },
  };
}
