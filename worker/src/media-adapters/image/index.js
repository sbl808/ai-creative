import { IMAGE_CONTRACT_VERSION } from '../../media-production/contracts/image.contract.js';
import { generateSharedImage } from '../../media-production/image/engine.js';

/**
 * Create a Studio-specific adapter for the shared Image contract.
 *
 * Existing Studio payloads remain unchanged at their public function boundary.
 * Provider credentials and plan/model context stay outside the contract request.
 */
export function createImageStudioAdapter(studioId, engine = generateSharedImage) {
  if (!['image', 'content', 'short', 'shop', 'story'].includes(studioId)) {
    throw new Error('unsupported_image_adapter_studio');
  }

  return async function generateStudioImage(env, {
    prompt,
    apiKey,
    model,
    plan,
    images,
  } = {}) {
    const input = {
      prompt,
    };

    // Only Shop's existing video-image workflow supports reference images.
    if (studioId === 'shop' && Array.isArray(images)) {
      input.images = images
        .filter(Boolean)
        .map(({ base64, mimeType }) => ({ base64, mimeType }));
    }

    const response = await engine(env, {
      contractVersion: IMAGE_CONTRACT_VERSION,
      studioId,
      operation: 'generate',
      input,
    }, {
      apiKey,
      model,
      plan,
    });

    return {
      data: response.result.data,
      mimeType: response.result.mimeType,
    };
  };
}
