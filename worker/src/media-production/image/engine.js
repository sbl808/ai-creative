import {
  IMAGE_CONTRACT_VERSION,
  validateImageRequestV1,
  validateImageResponseV1,
} from '../contracts/image.contract.js';
import { resolveModel } from '../../core/aiModels.js';
import { generateImage, generateMultimodal } from '../../core/ai/aiService.js';
import { referenceImageInstruction } from '../../core/utilities.js';

const IMAGE_TASK_BY_STUDIO = Object.freeze({
  image: 'image.image',
  content: 'content.image',
  short: 'short.image',
  shop: 'shop.image',
});

function createSafeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

/**
 * Build the shared Image execution function.
 *
 * Credentials and plan/model context are deliberately separate from the
 * versioned contract request. The request itself is never forwarded wholesale
 * to an AI provider.
 */
export function createSharedImageEngine(services = {}) {
  const resolveModelFn = services.resolveModel || resolveModel;
  const generateImageFn = services.generateImage || generateImage;
  const generateMultimodalFn = services.generateMultimodal || generateMultimodal;

  return async function generateSharedImage(env, request, executionContext = {}) {
    const validation = validateImageRequestV1(request);
    if (!validation.ok) throw createSafeError('invalid_image_request');

    if (request.operation !== 'generate') {
      throw createSafeError('unsupported_shared_image_operation');
    }

    const task = IMAGE_TASK_BY_STUDIO[request.studioId];
    if (!task) throw createSafeError('unsupported_shared_image_studio');

    const apiKey = executionContext.apiKey;
    const plan = executionContext.plan;
    const selectedModel = executionContext.model;

    let prompt = String(request.input.prompt).trim();
    const referenceImages = Array.isArray(request.input.images)
      ? request.input.images
      : [];

    // Preserve Shop's existing reference-image prompt enrichment behavior.
    // If enrichment fails, continue with the original user-approved prompt.
    if (request.studioId === 'shop' && referenceImages.length > 0) {
      try {
        const textModel = await resolveModelFn(
          env,
          'text',
          plan,
          selectedModel,
          'shop.text',
        );
        const enrichedPrompt = await generateMultimodalFn(env, {
          model: textModel,
          task: 'shop.text',
          prompt: prompt
            + '\n\n'
            + referenceImageInstruction(referenceImages, 'product')
            + '\n\nအထက်ပါ product reference ပုံများနှင့် ကိုက်ညီသော image generation prompt တစ်ခုတည်းကိုသာ ပြန်ပေးပါ။ (Return only the final image prompt, no extra text.)',
          images: referenceImages.map(({ base64, mimeType }) => ({
            base64,
            mimeType,
          })),
          apiKey,
        });
        if (typeof enrichedPrompt === 'string' && enrichedPrompt.trim()) {
          prompt = enrichedPrompt.trim();
        }
      } catch (_) {
        // Deliberate fallback: do not expose provider details or user media.
      }
    }

    const imageModel = await resolveModelFn(
      env,
      'image',
      plan,
      selectedModel,
      task,
    );
    const output = await generateImageFn(env, {
      model: imageModel,
      task,
      prompt,
      apiKey,
    });

    const response = {
      contractVersion: IMAGE_CONTRACT_VERSION,
      studioId: request.studioId,
      operation: 'generate',
      result: {
        data: output?.data,
        mimeType: output?.mimeType,
      },
    };
    const responseValidation = validateImageResponseV1(response);
    if (!responseValidation.ok) {
      throw createSafeError('invalid_image_provider_response');
    }

    return response;
  };
}

export const generateSharedImage = createSharedImageEngine();
