import { getAiModelById } from '../aiModels.js';
import { getAIProvider } from './providerRegistry.js';
import { AIServiceError, normalizeAIError } from './errors.js';
const DEFAULT_MODELS = Object.freeze({ generateSpeech: 'gemini-2.5-flash-preview-tts' });
export async function executeAI(env, operation, args = {}) {
  const modelId = String(args.model || DEFAULT_MODELS[operation] || '').trim();
  if (!modelId) throw new AIServiceError('model_required', 'model_required', { operation });
  const model = await getAiModelById(env, modelId);
  if (!model) throw new AIServiceError('model_not_found', 'model_not_found', { operation, model: modelId });
  if (!model.enabled || model.status !== 'active') throw new AIServiceError('model_unavailable', 'model_unavailable', { provider: model.provider, operation, model: modelId });
  if (args.task && !model.supported_tasks.includes(args.task)) throw new AIServiceError('task_not_supported', 'task_not_supported', { provider: model.provider, operation, model: modelId });
  try {
    const provider = getAIProvider(model.provider);
    const handler = provider[operation];
    if (typeof handler !== 'function') throw new AIServiceError('operation_not_supported', 'operation_not_supported', { provider: model.provider, operation, model: modelId });
    return await handler(env, { ...args, model: modelId });
  } catch (error) {
    throw normalizeAIError(error, { provider: model.provider, operation, model: modelId });
  }
}
export const generateText = (env,args) => executeAI(env,'generateText',args);
export const generateImage = (env,args) => executeAI(env,'generateImage',args);
export const generateMultimodal = (env,args) => executeAI(env,'generateMultimodal',args);
export const generateSpeech = (env,args) => executeAI(env,'generateSpeech',args);
