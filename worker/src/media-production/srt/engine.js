import {
  SRT_CONTRACT_VERSION,
  validateSrtRequestV1,
  validateSrtResponseV1,
} from '../contracts/srt.contract.js';
import { resolveModel } from '../../core/aiModels.js';
import { generateMultimodal } from '../../core/ai/aiService.js';

// Only route-backed Studio integrations are enabled here.
// Other Studio IDs remain reserved in the contract until their routes are verified.
const SRT_TASK_BY_STUDIO = Object.freeze({
  content: 'content.transcribe',
  voice: 'voice.transcribe',
});

function createSafeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

/**
 * Shared Audio -> SRT executor.
 *
 * Studio-specific instructions (including CMS rules and Voice knownText
 * handling) are prepared by the Studio adapter and passed separately as
 * executionContext.prompt. Credentials and execution settings never enter
 * the versioned SRT contract.
 *
 * User audio and subtitle text are processed in memory only. This engine
 * does not persist user media or content.
 */
export function createSharedSrtEngine(services = {}) {
  const resolveModelFn = services.resolveModel || resolveModel;
  const generateMultimodalFn = services.generateMultimodal || generateMultimodal;

  return async function generateSharedSrt(env, request, executionContext = {}) {
    const validation = validateSrtRequestV1(request);
    if (!validation.ok) throw createSafeError('invalid_srt_request');

    const task = SRT_TASK_BY_STUDIO[request.studioId];
    if (!task || request.operation !== 'audio-to-srt') {
      throw createSafeError('unsupported_shared_srt_capability');
    }

    const apiKey = String(executionContext.apiKey || '').trim();
    if (!apiKey) throw createSafeError('missing_api_key');

    const prompt = String(executionContext.prompt || '').trim();
    if (!prompt) throw createSafeError('missing_srt_instruction');

    const model = await resolveModelFn(
      env,
      'transcribe',
      executionContext.plan,
      executionContext.model,
      task,
    );

    const srt = await generateMultimodalFn(env, {
      model,
      task,
      prompt,
      images: [{
        mimeType: request.input.mimeType || 'audio/mpeg',
        base64: request.input.audioBase64,
      }],
      apiKey,
    });

    const response = {
      contractVersion: SRT_CONTRACT_VERSION,
      studioId: request.studioId,
      operation: request.operation,
      result: { srt },
    };
    const responseValidation = validateSrtResponseV1(response);
    if (!responseValidation.ok) {
      throw createSafeError('invalid_srt_provider_response');
    }

    return response;
  };
}

export const generateSharedSrt = createSharedSrtEngine();
