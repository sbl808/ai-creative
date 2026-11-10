import { createImageStudioAdapter } from '../image/index.js';

// Keeps the existing Short Studio function signature and result shape.
export const createShortImageAdapter = (engine) =>
  createImageStudioAdapter('short', engine);

export const generateShortVideoImage = createShortImageAdapter();
