// AI Creative Studio — shared design-system foundation
// Presentation-only tokens and accessibility defaults. Keep feature logic in its owning page.
export const AICS_DESIGN_SYSTEM_CSS = `<style>
:root {
  --aics-ds-space-1: 4px;
  --aics-ds-space-2: 8px;
  --aics-ds-space-3: 12px;
  --aics-ds-space-4: 16px;
  --aics-ds-space-5: 20px;
  --aics-ds-space-6: 24px;
  --aics-ds-radius-sm: 8px;
  --aics-ds-radius-md: 12px;
  --aics-ds-radius-lg: 16px;
  --aics-ds-focus: #818cf8;
  --aics-ds-motion-fast: 120ms;
  --aics-ds-motion-normal: 180ms;
  /* Semantic aliases used by the existing shared shell and settings UI. */
  --aics-radius-sm: var(--aics-ds-radius-sm);
  --aics-radius-md: var(--aics-ds-radius-md);
  --aics-radius-lg: var(--aics-ds-radius-lg);
  --aics-focus: rgba(129, 140, 248, .32);
}
:where(a, button, input, select, textarea, summary, [role="button"], [tabindex]):focus-visible {
  outline: 3px solid var(--aics-ds-focus);
  outline-offset: 2px;
}
:where(button, input, select, textarea) {
  font: inherit;
}
:where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]), select, textarea) {
  max-width: 100%;
  border-radius: var(--aics-ds-radius-sm);
}
:where(button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]) {
  touch-action: manipulation;
}
:where(img, video, canvas) {
  max-width: 100%;
}
/* Keep shared content surfaces aligned without replacing page-specific colors. */
.studio-card, .project-card, .creation-card, .card {
  border-radius: var(--aics-ds-radius-lg);
}
button, .btn, [role="button"], .nav-item, .nav-btn, .side-btn {
  transition-duration: var(--aics-ds-motion-fast);
}
@media (max-width: 480px) {
  .aics-app, .aics-app .layout, .aics-app .main, .aics-app .aics-main, .aics-app .aics-work {
    min-width: 0;
  }
  .aics-app :where(pre, code) {
    overflow-wrap: anywhere;
  }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>`;

// Studio-only visual contract. Injected only by renderSidebar({ variant: 'studio' })
// so Home, Creations, Settings, and Admin retain their existing presentation.
export const AICS_STUDIO_UI_CSS = `<style>
.aics-app {
  --aics-studio-control-radius: var(--aics-ds-radius-sm);
  --aics-studio-surface-radius: var(--aics-ds-radius-md);
}
.aics-app .aics-work :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]), select, textarea, .result-text, .result-textarea, .srt-editable, .shop-result) {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  border-radius: var(--aics-studio-control-radius);
}
.aics-app .aics-work :is(.card, .vcard, .mode-card, .choice-card, .result-card, .final-char-card, .final-scene-card, .conditional-fields, .adv-panel, .adv-grid, .audio-box, .source-note, .status-list, .aics-out-hub, .aics-out-card, .shop-out-hub) {
  border-radius: var(--aics-studio-surface-radius);
}
.aics-app .aics-work :is(button, .btn, [role="button"], .choice-card, .vchip, .type-chip, .gender-opt) {
  touch-action: manipulation;
  transition-duration: var(--aics-ds-motion-fast);
}
.aics-app .aics-work :is(.btn, .btn-primary, .btn-secondary, .btn-purple, .btn-green, .btn-orange, .btn-sm, .primary, .secondary, .purple, .ghost, .success, .danger) {
  min-height: 44px;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.aics-app .aics-work :is(button, input, select, textarea, a, summary, [role="button"], [tabindex]):focus-visible {
  outline: 3px solid var(--aics-ds-focus);
  outline-offset: 2px;
}
.aics-app .aics-work :is(.btn-row, .top-actions, .dir-row, .btn-group, .chat-input-row) {
  min-width: 0;
  flex-wrap: wrap;
}
.aics-app .aics-work :is(img, video, canvas, audio) {
  max-width: 100%;
}
.aics-app .aics-stepper {
  min-width: 0;
  max-width: 100%;
  overscroll-behavior-x: contain;
}
@media (max-width: 600px) {
  .aics-app .aics-work :is(.choice-grid, .mode-grid, .seg, .shop-out-cards, .branch-action-grid) {
    grid-template-columns: minmax(0, 1fr);
  }
  .aics-app .aics-work :is(.btn-row, .top-actions) > .btn {
    flex: 1 1 100%;
  }
}
</style>`;
