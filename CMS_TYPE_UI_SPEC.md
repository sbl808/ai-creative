# CMS Type UI Specification

CMS-connected Type selectors are marked with `.aics-cms-type-field`. The Type control occupies its own single-column row in the studio form, while the actual select stays compact (max 360px). It uses a distinct cyan/purple light-gradient accent so CMS Type choices are visually different from ordinary settings.

Covered:
- Story: `storyTypeSel`, `vidTypeSel`
- Short: `shortTypeSel` (also reused by Short Video CMS)
- Content: `generationLevelSel`, `videoGenerationLevelSel`
- Image: `imgTypeSel`
- Shop: `contentPurposeSel`
- Voice: no user-facing Type dropdown; workflow types are backend-defined.
