import { createImageStudioAdapter } from '../image/index.js';

// Keeps Story's prompt-only input and existing image result shape.
export const createStoryImageAdapter = (engine) =>
  createImageStudioAdapter('story', engine);

export const generateStoryVideoImage = createStoryImageAdapter();
