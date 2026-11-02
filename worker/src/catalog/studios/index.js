// Public domain entry point for the static Studio Catalog.
// Keep the existing registry as the source of truth during migration.
export {
  STUDIO_REGISTRY,
  STUDIO_ORDER,
  SITE_LINKS,
  getStudio,
  isStudioEnabled,
  listEnabledStudios,
} from '../../config/studios.js';
