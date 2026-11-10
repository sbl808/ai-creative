import {
  TRANSLATION_CONTRACT_VERSION,
  validateTranslationRequestV1,
  validateTranslationResponseV1,
} from '../contracts/translation.contract.js';
import { resolveModel } from '../../core/aiModels.js';
import { generateText } from '../../core/ai/aiService.js';

const TASK_BY_STUDIO = Object.freeze({
  content: 'content.transcribe',
  voice: 'voice.transcribe',
});

function safeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

/**
 * Shared SRT translation executor.
 * Studio-specific instructions and credentials stay outside the contract.
 * Subtitle content is processed in memory and is never persisted here.
 */
export function createSharedTranslationEngine(services = {}) {
  const resolveModelFn = services.resolveModel || resolveModel;
  const generateTextFn = services.generateText || generateText;

  return async function translateSharedSrt(env, request, executionContext = {}) {
    if (!validateTranslationRequestV1(request).ok) {
      throw safeError('invalid_translation_request');
    }

    const task = TASK_BY_STUDIO[request.studioId];
    if (!task || request.operation !== 'translate-srt') {
      throw safeError('unsupported_shared_translation_capability');
    }

    const apiKey = String(executionContext.apiKey || '').trim();
    if (!apiKey) throw safeError('missing_api_key');

    const prompt = String(executionContext.prompt || '').trim();
    if (!prompt) throw safeError('missing_translation_instruction');

    const model = await resolveModelFn(
      env, 'transcribe', executionContext.plan, executionContext.model, task,
    );
    const srt = await generateTextFn(env, { model, task, prompt, apiKey });

    const response = {
      contractVersion: TRANSLATION_CONTRACT_VERSION,
      studioId: request.studioId,
      operation: request.operation,
      result: { srt },
    };
    if (!validateTranslationResponseV1(response).ok) {
      throw safeError('invalid_translation_provider_response');
    }
    return response;
  };
}

export const translateSharedSrt = createSharedTranslationEngine();
