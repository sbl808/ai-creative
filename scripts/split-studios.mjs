#!/usr/bin/env node
/**
 * AI Creative Studio V2 — Studio Isolation Refactor splitter
 * -----------------------------------------------------------
 * Splits each large studio frontend file into a standalone package:
 *   frontend/studios/<studio>/
 *     ui.js         — HTML step fragments (STEPS / STEP*_HTML / CONTENT_HTML|STEPS_HTML)
 *     constants.js  — browser-side constant data           (export X_SCRIPT)
 *     state.js      — browser-side mutable state           (export X_SCRIPT)
 *     helpers.js    — browser-side utility functions       (export X_SCRIPT)
 *     api.js        — browser-side API-calling functions   (export X_SCRIPT)
 *     actions.js    — browser-side UI actions              (export X_SCRIPT)
 *     stepper.js / video.js / audio.js / image.js / shell.js — additional slices
 *     page.js       — final HTML composition (head/CSS/body + assembled <script>)
 *     index.js      — backward-compatible re-export shim (written after verification)
 *
 * Guarantee: the reassembled HTML export is byte-identical to the original
 * export. Verified by scripts/verify-split.mjs before shims are written.
 *
 * Rules honoured:
 *   - No Studio deleted / renamed (rule 2)
 *   - No API contract change (rule 3)
 *   - No DB schema change (rule 4)
 *   - Protected files untouched by THIS script
 *   - Duplicates NOT deleted (rule 8); originals archived to frontend/_legacy/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'worker', 'src', 'frontend');
const LEGACY = path.join(FRONTEND, '_legacy');
const OUT = path.join(FRONTEND, 'studios');

// Segment anchor tables: each segment starts at `anchor` (1-based) and ends just
// before the next segment's anchor (last segment ends at the </script> boundary).
// `expected` must appear within the first non-blank lines of the segment
// (safety assertion). Full script coverage is guaranteed by construction.
const STUDIOS = [
  {
    slug: 'story', src: 'story.js', htmlExport: 'STORY_HTML', uiConcat: 'CONTENT_HTML', uiStart: 'const STEPS = [',
    scriptStart: 412, scriptEnd: 1241,
    segs: [
      ['state',     412, 'var token=localStorage.getItem'],
      ['constants', 428, 'var STORY_TYPES=['],
      ['helpers',   464, '(function init(){'],
      ['actions',   651, '// ===================== Step 01 \u2192 02 (Story Generate'],
      ['stepper',   1144, '// Branch Stepper State Machine'],
    ],
  },
  {
    slug: 'content', src: 'content.js', htmlExport: 'CONTENT_HTML', uiConcat: 'STEPS_HTML', uiStart: 'const STEPS = [',
    uiSplit: 'const STEP22_HTML',
    scriptStart: 667, scriptEnd: 1756,
    segs: [
      ['state',     667,  'var token=localStorage.getItem'],
      ['constants', 731,  '// ===== Branch Stepper State Machine'],
      ['helpers',   766,  '(function init(){'],
      ['api',       1006, '// ===== Step 01 \u2014 Conditional Fields'],
      ['audio',     1355, '// ===== Audio Branch \u2014 Voice Selection'],
      ['shell',     1579, '// ===== Studio Shell Hooks'],
    ],
  },
  {
    slug: 'short', src: 'short.js', htmlExport: 'SHORT_HTML', uiConcat: 'CONTENT_HTML', uiStart: 'const STEPS = [',
    scriptStart: 271, scriptEnd: 1125,
    segs: [
      ['state',     271,  'var token=localStorage.getItem'],
      ['constants', 290,  'var SHORT_TYPES=['],
      ['helpers',   306,  '(function init(){'],
      ['actions',   376,  '// ===================== Step 01 \u2192 02 \u2192 03 (Short Generate)'],
      ['shell',     844,  'Error Helpers'],
      ['stepper',   1023, 'window.studioReset=function(){'],
    ],
  },
  {
    slug: 'image', src: 'image.js', htmlExport: 'IMAGE_HTML', uiConcat: 'STEPS_HTML', uiStart: 'const STEPS = [',
    scriptStart: 201, scriptEnd: 920,
    segs: [
      ['state',     201, 'var token=localStorage.getItem'],
      ['api',       230, '(function init(){'],
      ['actions',   561, '// ===================== Actions ====================='],
      ['stepper',   829, 'var ST_MODE='],
    ],
  },
  {
    slug: 'voice', src: 'voice.js', htmlExport: 'VOICE_HTML', uiConcat: null, uiStart: 'const HOME_HTML = `',
    scriptStart: 72, scriptEnd: 617,
    segs: [
      ['constants', 72,  '// ==== Voice Studio Browser-side Constants / Helpers'],
      ['state',     110, 'var TOKEN=localStorage.getItem'],
      ['helpers',   124, 'function toast(msg,type){'],
      ['actions',   233, 'function voiceRenderCombinedStepper(phase,step){'],
    ],
  },
  {
    slug: 'shop', src: 'shop.js', htmlExport: 'SHOP_HTML', uiConcat: 'STEPS_HTML', uiStart: 'const STEPS = [',
    scriptStart: 586, scriptEnd: 2133,
    segs: [
      ['state',     586,  'var TOKEN=localStorage.getItem'],
      ['constants', 636,  '// Content Purpose'],
      ['helpers',   688,  '// ===================== Helpers ====================='],
      ['actions',   806,  '// ===================== Product Information Input'],
      ['video',     1176, '// ===================== VIDEO BRANCH ====================='],
      ['audio',     1427, '// ===================== AUDIO BRANCH ====================='],
      ['image',     1817, '// ===================== IMAGE BRANCH'],
      ['shell',     1927, '// ===================== Studio Shell Hooks'],
    ],
  },
];

const SEG_VAR = (name) => name.toUpperCase() + '_SCRIPT';
const NAME = (slug) => slug[0].toUpperCase() + slug.slice(1);

function readLines(p) { return fs.readFileSync(p, 'utf8').split('\n'); }
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAILED: ' + msg); process.exit(1); } }

function findLine(lines, from, fragment, what) {
  for (let i = from; i < lines.length; i++) if (lines[i].includes(fragment)) return i + 1;
  assert(false, `line "${fragment}" not found after line ${from} (${what})`);
}

function extractTemplateLiteral(lines, startLine, what) {
  // Returns ONLY the text between the backticks (escape sequences preserved verbatim).
  let out = [];
  let collecting = false;
  for (let i = startLine - 1; i < lines.length; i++) {
    const line = lines[i];
    let segment = '';
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '\\') {
        if (collecting) { segment += ch; if (j + 1 < line.length) { segment += line[j + 1]; j++; } }
        continue;
      }
      if (ch === '`') {
        if (!collecting) { collecting = true; continue; }
        out.push(segment);
        return { content: out.join('\n'), endLine: i + 1 };
      }
      if (collecting) segment += ch;
    }
    if (collecting) out.push(segment);
  }
  assert(false, 'unterminated template literal for ' + what);
}

function extractUiBlock(lines, htmlExport, uiStart) {
  const startIdx = findLine(lines, 0, uiStart, 'ui start') - 1;
  const expIdx = findLine(lines, 0, 'export const ' + htmlExport + ' = `', 'export') - 1;
  const uiLines = [];
  for (let i = startIdx; i < expIdx; i++) {
    const trimmed = lines[i].trim();
    if (/^const (CONTENT_HTML|STEPS_HTML) = .*;?$/.test(trimmed)) {
      uiLines.push(lines[i]);
      if (i + 1 < expIdx && lines[i + 1].trim() === '') uiLines.push('');
      break;
    }
    uiLines.push(lines[i]);
  }
  while (uiLines.length && uiLines[uiLines.length - 1].trim() === '') uiLines.pop();
  return uiLines.join('\n');
}

// Split a ui block into ui.js + fragments.js so no generated file exceeds 500 lines.
// Returns { ui, frag } — frag is null when no split is needed.
function splitUiBlock(block, marker) {
  if (!marker) return { ui: block, frag: null };
  const lines = block.split('\n');
  const idx = lines.findIndex((l) => l.trim().startsWith(marker));
  if (idx === -1) throw new Error('ui split marker not found: ' + marker);
  // fragments part: from marker to end (includes the concat line)
  const fragLines = lines.slice(idx);
  while (fragLines.length && fragLines[fragLines.length - 1].trim() === '') fragLines.pop();
  const uiLines = lines.slice(0, idx);
  while (uiLines.length && uiLines[uiLines.length - 1].trim() === '') uiLines.pop();
  // step constants needed by fragments (defined in ui part)
  const stepNames = [...uiLines.join('\n').matchAll(/^const (STEP\d+_HTML) =/gm)].map((m) => m[1]);
  return { ui: uiLines.join('\n'), frag: { content: fragLines.join('\n'), imports: stepNames } };
}

function extractMainTemplate(lines, htmlExport) {
  const expLine = findLine(lines, 0, 'export const ' + htmlExport + ' = `', 'export');
  return extractTemplateLiteral(lines, expLine, htmlExport);
}

function writeUiFile(slug, uiBlock, src, uiConcat, frag) {
  const needsLoading = uiBlock.includes('aicsResultLoadingHtml');
  const uiExports = uiConcat
    ? (frag ? `STEPS, ${frag.imports.join(', ')}` : `STEPS, ${uiConcat}`)
    : 'HOME_HTML';
  let file = `// AI Creative Studio — ${NAME(slug)} Studio / ui.js (V2 refactor)
// HTML step fragments — extracted VERBATIM from frontend/${src} (v1).
${needsLoading ? "import { aicsResultLoadingHtml } from '../../shared.js';\n" : ''}${uiBlock}

export { ${uiExports} };
`;
  fs.mkdirSync(path.join(OUT, slug), { recursive: true });
  fs.writeFileSync(path.join(OUT, slug, 'ui.js'), file);

  if (frag) {
    const importLines = frag.imports.map((n) => `import { ${n} } from './ui.js';`).join('\n');
    const fragLoading = frag.content.includes('aicsResultLoadingHtml')
      ? "import { aicsResultLoadingHtml } from '../../shared.js';\n"
      : '';
    const fragFile = `// AI Creative Studio — ${NAME(slug)} Studio / fragments.js (V2 refactor)
// Additional HTML step fragments — extracted VERBATIM from frontend/${src} (v1).
// Split from ui.js so no generated file exceeds 500 lines (rule 9).
${importLines}${fragLoading}${frag.content}

export { ${uiConcat} };
`;
    fs.writeFileSync(path.join(OUT, slug, 'fragments.js'), fragFile);
  }
}

function writeSegmentFile(slug, segName, content, src) {
  const extra = segName === 'state' && slug === 'shop' ? "import { STEPS } from './ui.js';\n" : '';
  const file = `// AI Creative Studio — ${NAME(slug)} Studio / ${segName}.js (V2 refactor)
// Browser-side ${segName} — extracted VERBATIM from frontend/${src} (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
${extra}export const ${SEG_VAR(segName)} = \`${content}\`;
`;
  fs.mkdirSync(path.join(OUT, slug), { recursive: true });
  fs.writeFileSync(path.join(OUT, slug, segName + '.js'), file);
}

function writePageFile(slug, htmlExport, template, open, close, segNames, src, uiConcat, frag) {
  const segImports = segNames.map((n) => `import { ${SEG_VAR(n)} } from './${n}.js';`).join('\n');
  const scriptAssembly = segNames.map((n) => '${' + SEG_VAR(n) + '}').join('');
  const newTemplate = template.slice(0, open + '<script>'.length) + scriptAssembly + template.slice(close);
  const uiImport = uiConcat
    ? (frag
        ? `import { STEPS } from './ui.js';\nimport { ${uiConcat} } from './fragments.js';\n`
        : `import { STEPS, ${uiConcat} } from './ui.js';\n`)
    : `import { HOME_HTML } from './ui.js';\n`;
  const file = `// AI Creative Studio — ${NAME(slug)} Studio / page.js (V2 refactor)
// Final HTML composition — head/CSS/body from ${src} (v1) + browser <script> assembled
// from the segment modules in the ORIGINAL source order. Byte-identical output vs v1.
import { renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml } from '../../shared.js';
${uiImport}${segImports}

export const ${htmlExport} = \`${newTemplate}\`;

export default ${htmlExport};
`;
  fs.writeFileSync(path.join(OUT, slug, 'page.js'), file);
}

function archiveOriginal(slug, src) {
  const archivePath = path.join(LEGACY, `${slug}_v1_full.js`);
  if (fs.existsSync(archivePath)) return; // idempotent — never overwrite the v1 archive
  fs.mkdirSync(LEGACY, { recursive: true });
  const content = fs.readFileSync(path.join(FRONTEND, src), 'utf8');
  // Keep the archive importable from _legacy/ (relative import depth changes by one)
  fs.writeFileSync(archivePath, content.replace(/'\.\/shared\.js'/g, "'../shared.js'"));
}

function sourceFor(s) {
  const archive = path.join(LEGACY, `${s.slug}_v1_full.js`);
  return fs.existsSync(archive) ? archive : path.join(FRONTEND, s.src);
}

let passCount = 0;
for (const s of STUDIOS) {
  const lines = readLines(sourceFor(s));
  const uiBlock0 = extractUiBlock(lines, s.htmlExport, s.uiStart);
  const uiFrag = splitUiBlock(uiBlock0, s.uiSplit || null);
  const uiBlock = uiFrag.ui;
  const tpl = extractMainTemplate(lines, s.htmlExport);
  const open = tpl.content.indexOf('<script>');
  const close = tpl.content.lastIndexOf('</script>');
  assert(open !== -1 && close !== -1 && close > open, `${s.slug}: script tags not found`);

  const bodyLines = tpl.content.slice(open + '<script>'.length, close).split('\n');

  // Build segment ranges from anchors (full coverage by construction)
  // bodyLines[k] corresponds to file line (scriptStart + k - 1) because the
  // slice starts right after `<script>` (i.e. on the newline that precedes line scriptStart).
  const anchors = s.segs.map(([name, line]) => ({ name, line }));
  for (let i = 0; i < anchors.length; i++) {
    const relStart = i === 0 ? 0 : anchors[i].line - s.scriptStart + 1;
    const relEnd = i + 1 < anchors.length ? anchors[i + 1].line - s.scriptStart : bodyLines.length - 1;
    assert(relStart >= 0 && relStart <= relEnd && relEnd < bodyLines.length, `${s.slug}/${anchors[i].name} range invalid`);
    const probe = bodyLines.slice(relStart, relStart + 4).find((l) => l.trim() !== '');
    assert(probe !== undefined && probe.includes(s.segs[i][2]), `${s.slug}/${anchors[i].name} anchor mismatch @${anchors[i].line}: ${JSON.stringify(String(probe).slice(0, 70))}`);
    // content keeps line terminators exactly: join + one trailing '\n' for every
    // segment except the last (the final body line is already terminated by the
    // trailing '' element that split('\n') produces before `</script>`).
    const content = bodyLines.slice(relStart, relEnd + 1).join('\n') + (i < anchors.length - 1 ? '\n' : '');
    writeSegmentFile(s.slug, anchors[i].name, content, s.src);
  }

  writeUiFile(s.slug, uiBlock, s.src, s.uiConcat, uiFrag.frag);
  writePageFile(s.slug, s.htmlExport, tpl.content, open, close, anchors.map((a) => a.name), s.src, s.uiConcat, uiFrag.frag);
  archiveOriginal(s.slug, s.src);

  console.log(`✔ split ${s.slug}: ${anchors.map((a, i) => {
    const end = i + 1 < anchors.length ? anchors[i + 1].line - 1 : s.scriptEnd;
    return `${a.name}[${a.line}-${end}]`;
  }).join(', ')}`);
  passCount++;
}

console.log(`\nSplit complete: ${passCount}/${STUDIOS.length} studios → ${OUT}`);
console.log('Next: run scripts/verify-split.mjs (byte-identity check) before applying shims.');
