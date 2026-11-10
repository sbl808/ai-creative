import { createImageStudioAdapter } from '../image/index.js';

// Keeps the existing Content Studio function signature and result shape.
export const generateContentVideoImage = createImageStudioAdapter('content');
