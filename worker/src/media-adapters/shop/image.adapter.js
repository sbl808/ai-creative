import { createImageStudioAdapter } from '../image/index.js';

// Keeps Shop's optional product-reference-image input and result shape.
export const createShopImageAdapter = (engine) =>
  createImageStudioAdapter('shop', engine);

export const generateShopVideoImage = createShopImageAdapter();
