import { createImageStudioAdapter } from './index.js';

// Image prompt and ad-prompt generation remain in Image Studio Brain.
// This adapter handles only the final image-generation operation.
export const createImageStudioImageAdapter = (engine) =>
  createImageStudioAdapter('image', engine);

export const generateImageFromPrompt = createImageStudioImageAdapter();
