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
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>`;
