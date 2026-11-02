// Studio Brain domain entry point.
// Global Policy is deliberately exposed by cms/global-policies instead.
export {
  BRAIN_SCOPE_STORY_TYPES,
  BRAIN_SCOPE_STORY_VIDEO,
  BRAIN_MODULE_STORY_TYPE,
  BRAIN_MODULE_VIDEO_KNOWLEDGE,
  BRAIN_MODULE_VISUAL_STYLE,
  BRAIN_MODULE_VIDEO_WORKFLOW,
  BRAIN_TYPE_BASE,
  BRAIN_LAYER_ORDER,
  getStudioStoryTypeConfig,
  getStudioVideoContext,
  buildBrainPrompt,
} from '../../core/cmsBrain.js';
