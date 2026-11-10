import { createImageStudioAdapter } from '../image/index.js';

// Keeps the existing Content Studio function signature and result shape.
export const createContentImageAdapter = (engine) =>
  createImageStudioAdapter('content', engine);

export const generateContentVideoImage = createContentImageAdapter();
