import { createImageStudioAdapter } from '../image/index.js';

// Keeps the existing Short Studio function signature and result shape.
export const generateShortVideoImage = createImageStudioAdapter('short');
