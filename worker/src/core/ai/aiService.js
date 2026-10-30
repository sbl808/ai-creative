import { getAiModelById } from '../aiModels.js';
import { getAIProvider } from './providerRegistry.js';
import { AIServiceError, normalizeAIError } from './errors.js';
const DEFAULT_MODELS = Object.freeze({ generateSpeech: 'gemini-2.5-flash-preview-tts' });
const REQUIRED_CAPABILITIES = Object.freeze({
  generateText: { text: ['text-generation'], transcribe: ['subtitle-generation', 'text-translation'] },
  generateImage: { image: ['image-generation'] },
  generateMultimodal: { text: ['multimodal-input'], transcribe: ['audio-transcription'] },
  generateSpeech: { voice: ['text-to-speech'] },
});
function assertTaskAndCapability(model, operation, task) {
  if (!task) return;
  if (!Array.isArray(model.supported_tasks) || !model.supported_tasks.includes(task)) throw new AIServiceError('task_not_supported', 'task_not_supported', { provider: model.provider, operation, model: model.id });
  const category = task.slice(task.lastIndexOf('.') + 1), alternatives = REQUIRED_CAPABILITIES[operation]?.[category];
  if (!alternatives) throw new AIServiceError('operation_not_supported', 'operation_not_supported', { provider: model.provider, operation, model: model.id });
  const capabilities = Array.isArray(model.capabilities) ? model.capabilities : [];
  if (!alternatives.some(capability => capabilities.includes(capability))) throw new AIServiceError('capability_not_supported', 'capability_not_supported', { provider: model.provider, operation, model: model.id });
}
export async function executeAI(env, operation, args = {}) {
  const modelId = String(args.model || DEFAULT_MODELS[operation] || '').trim();
  if (!modelId) throw new AIServiceError('model_required', 'model_required', { operation });
  const model = await getAiModelById(env, modelId);
  if (!model) throw new AIServiceError('model_not_found', 'model_not_found', { operation, model: modelId });
  if (!model.enabled || model.status !== 'active') {
    const code = model.status === 'deprecated' ? 'model_deprecated' : 'model_unavailable';
    throw new AIServiceError(code, code, { provider: model.provider, operation, model: modelId });
  }
  assertTaskAndCapability(model, operation, args.task);
  try {
    const provider = getAIProvider(model.provider), handler = provider[operation];
    if (typeof handler !== 'function') throw new AIServiceError('operation_not_supported', 'operation_not_supported', { provider: model.provider, operation, model: modelId });
    return await handler(env, { ...args, model: modelId });
  } catch (error) { throw normalizeAIError(error, { provider: model.provider, operation, model: modelId }); }
}
export const generateText = (env, args) => executeAI(env, 'generateText', args);
export const generateImage = (env, args) => executeAI(env, 'generateImage', args);
export const generateMultimodal = (env, args) => executeAI(env, 'generateMultimodal', args);
export const generateSpeech = (env, args) => executeAI(env, 'generateSpeech', args);
