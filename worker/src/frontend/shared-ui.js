// AI Creative Studio — Generic Shared Browser Components (V2 refactor, rule 7)
// -----------------------------------------------------------------------------
// Canonical home for the GENERIC shared components: Loading, Toast, Copy,
// Error Dialog, Confirm Dialog, Modal, Common Utilities.
//
// IMPORTANT (rule 8 — duplicates are NOT deleted until regression-tested):
// The 6 studio packages still ship their own byte-identical copies of these
// helpers (extracted verbatim in each studio's helpers.js) so that v1 behaviour
// is guaranteed. This module is the MERGE TARGET: new pages/components should
// use these exports, and each duplicate can be migrated here one-by-one after
// browser-level regression passes (see DUPLICATE_REPORT.md — KEEP/MOVE/MERGE/
// DELETE-LATER classification).
//
// NOT shared (Studio identity is preserved): Story UI, Content UI, Voice UI,
// Image UI, Shop workflow, Short workflow — those live in the studio packages.

// ---------------------------------------------------------------------------
// Loading — the result-loading card (already shared in shared.js as
// aicsResultLoadingHtml; kept here as the documented canonical entry).
// ---------------------------------------------------------------------------
export { aicsResultLoadingHtml } from './shared.js';

// ---------------------------------------------------------------------------
// Toast — canonical base component (HTML element + browser-side script)
// ---------------------------------------------------------------------------
export function aicsToastHtml(defaultText) {
  return '<div class="toast" id="toast">' + (defaultText || '&#9989; ကူးယူပြီးပါပြီ') + '</div>';
}

export const AICS_TOAST_SCRIPT = `
function aicsShowToast(msg, type, ms) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg || '';
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(function () { t.className = 'toast'; }, ms || 2500);
}
`;

// ---------------------------------------------------------------------------
// Copy — clipboard helper (canonical implementation)
// ---------------------------------------------------------------------------
export const AICS_COPY_SCRIPT = `
function aicsCopyText(text, doneMsg) {
  if (!text) { if (typeof aicsShowToast === 'function') aicsShowToast('Text မရှိပါ'); return; }
  var onDone = function () { if (typeof aicsShowToast === 'function') aicsShowToast(doneMsg || '&#9989; ကူးယူပြီးပါပြီ'); };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(onDone);
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    onDone();
  }
}
`;

// ---------------------------------------------------------------------------
// Error Dialog — base show/hide helpers (friendly messages)
// ---------------------------------------------------------------------------
export const AICS_ERROR_SCRIPT = `
function aicsShowError(prefix, e) {
  var el = document.getElementById('errorMsg');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = '<span style="opacity:.85">' + (prefix || '') + '</span> ' +
    (e && e.message ? String(e.message) : 'Something went wrong. Please try again.');
}
function aicsHideError() {
  var el = document.getElementById('errorMsg');
  if (!el) return;
  el.style.display = 'none';
}
`;

// ---------------------------------------------------------------------------
// Confirm Dialog — safe wrapper around the native confirm()
// ---------------------------------------------------------------------------
export const AICS_CONFIRM_SCRIPT = `
function aicsConfirm(message, onYes) {
  if (window.confirm(message || 'ဆက်လုပ်မည်လား?')) { if (onYes) onYes(); return true; }
  return false;
}
`;

// ---------------------------------------------------------------------------
// Modal — generic overlay helpers (login overlay pattern)
// ---------------------------------------------------------------------------
export const AICS_MODAL_SCRIPT = `
function aicsShowModal(id) { var m = document.getElementById(id); if (m) m.style.display = 'flex'; }
function aicsHideModal(id) { var m = document.getElementById(id); if (m) m.style.display = 'none'; }
`;

// ---------------------------------------------------------------------------
// Common Utilities — canonical implementations (each studio's helpers.js has
// its own byte-identical v1 copy; migrate per-function after regression).
// ---------------------------------------------------------------------------
export const AICS_COMMON_UTILS_SCRIPT = `
function aicsEscapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
function aicsDebounce(fn, ms) {
  var t = null;
  return function () {
    var a = arguments, c = this;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(c, a); }, ms || 400);
  };
}
function aicsSel(id) { return document.getElementById(id); }
function aicsFillSelect(el, arr, valKey, labelKey) {
  if (!el || !arr) return;
  el.innerHTML = '';
  arr.forEach(function (x) {
    var o = document.createElement('option');
    o.value = x[valKey || 'v'];
    o.textContent = x[labelKey || 'label'];
    el.appendChild(o);
  });
}
function aicsAutoExpand(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight + 2) + 'px';
}
`;

// Note: apiCall is intentionally NOT centralised here — each studio talks to a
// different endpoint set and has bespoke error handling. Studio isolation rule
// (rule 6) keeps API logic inside each studio package's api/helpers modules.

// ---------------------------------------------------------------------------
// Result Hub — V2.1 Unified Workflow Hub (ADDITIVE; no existing export changed)
// Shared "step 4" component: progress chain + result body + toolbar + "continue
// with this result" cards. A studio passes plain data; the component only builds
// HTML. Callbacks are registered per render (window.aicsHubRun(index)).
//
//   aicsResultHub({
//     pipeline: [{ label, done, current }],       // e.g. Audio ✓ → SRT → Translate
//     body:     '<html>',                          // the result itself (audio, textarea…)
//     tools:    [{ label, fn }],                   // Copy / Save / Retry …
//     afterHtml:'<html>',                          // optional options placed above the next-cards
//     nextTitle:'Continue with this result',
//     next:     [{ icon, label, desc, locked, fn }]
//   })  ->  HTML string
// ---------------------------------------------------------------------------
export const AICS_RESULT_HUB_CSS = `
.aics-work .aics-hub-pipe{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 12px;font-size:12px}
.aics-work .aics-hub-pill{padding:3px 10px;border-radius:999px;border:1px solid var(--border,rgba(0,229,255,.15));color:var(--muted,#8b95a8);background:var(--card2,#111a2e)}
.aics-work .aics-hub-pill.done{color:var(--success,#00e676);border-color:rgba(0,230,118,.3);background:rgba(0,230,118,.08)}
.aics-work .aics-hub-pill.current{border-color:rgba(123,92,255,.6);color:#fff}
.aics-work .aics-hub-arrow{color:var(--muted,#8b95a8)}
.aics-work .aics-hub-tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px}
.aics-work .aics-hub-tool{appearance:none;min-height:40px;padding:8px 13px;border-radius:9px;border:1px solid var(--border,rgba(0,229,255,.15));background:var(--card2,#111a2e);color:var(--text,#e8ecf4);font-size:13px;font-weight:600;cursor:pointer}
.aics-work .aics-hub-tool:hover{border-color:var(--cyan,#00e5ff)}
.aics-work .aics-hub-title{font-weight:700;color:var(--cyan,#00e5ff);margin:16px 0 8px;font-size:13px}
.aics-work .aics-hub-next-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.aics-work .aics-hub-next{appearance:none;text-align:left;display:flex;flex-direction:column;gap:3px;padding:13px;border-radius:12px;border:1px solid var(--border,rgba(0,229,255,.15));background:var(--card2,#111a2e);color:var(--text,#e8ecf4);cursor:pointer;min-height:64px}
.aics-work .aics-hub-next:hover{border-color:var(--cyan,#00e5ff)}
.aics-work .aics-hub-next b{font-size:14px}
.aics-work .aics-hub-next span{font-size:12px;color:var(--muted,#8b95a8)}
.aics-work .aics-hub-lock{font-size:11px;color:var(--warn,#ffc107)}
@media(max-width:700px){.aics-work .aics-hub-next-grid{grid-template-columns:1fr}}
`;

export const AICS_RESULT_HUB_SCRIPT = `
var __aicsHubCbs = [];
function aicsHubEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function aicsHubRun(i) { var f = __aicsHubCbs[i]; if (typeof f === 'function') f(); }
function aicsResultHub(o) {
  o = o || {};
  __aicsHubCbs = [];
  function reg(fn) { __aicsHubCbs.push(fn); return __aicsHubCbs.length - 1; }
  var h = '';
  if (o.pipeline && o.pipeline.length) {
    h += '<div class="aics-hub-pipe">';
    o.pipeline.forEach(function (p, i) {
      if (i) h += '<span class="aics-hub-arrow">→</span>';
      h += '<span class="aics-hub-pill' + (p.done ? ' done' : '') + (p.current ? ' current' : '') + '">' + (p.done ? '✓ ' : '') + aicsHubEsc(p.label) + '</span>';
    });
    h += '</div>';
  }
  h += o.body || '';
  if (o.tools && o.tools.length) {
    h += '<div class="aics-hub-tools">';
    o.tools.forEach(function (t) {
      h += '<button type="button" class="aics-hub-tool" onclick="aicsHubRun(' + reg(t.fn) + ')">' + aicsHubEsc(t.label) + '</button>';
    });
    h += '</div>';
  }
  h += o.afterHtml || '';
  if (o.next && o.next.length) {
    h += '<div class="aics-hub-title">' + aicsHubEsc(o.nextTitle || 'Continue with this result') + '</div><div class="aics-hub-next-grid">';
    o.next.forEach(function (n) {
      h += '<button type="button" class="aics-hub-next" onclick="aicsHubRun(' + reg(n.fn) + ')"><b>' + (n.icon ? aicsHubEsc(n.icon) + ' ' : '') + aicsHubEsc(n.label) + (n.locked ? ' <span class="aics-hub-lock">🔒 Pro</span>' : '') + '</b>' + (n.desc ? '<span>' + aicsHubEsc(n.desc) + '</span>' : '') + '</button>';
    });
    h += '</div>';
  }
  return h;
}
`;

// ============================================================
// GLOBAL RESULT UI — Global Result Box Component (shared-ui.js)
// ------------------------------------------------------------
// ONE reusable result component used by ALL studios
// (Story / Content / Short / Image / Voice / Shop). It owns the
// result state machine and the streaming display; no studio
// re-implements result state / expand / collapse / streaming.
//
// States: IDLE → GENERATING → COMPLETED → COLLAPSED ⇄ EXPANDED
//         GENERATING → ERROR (streamed content is preserved)
//         ANY STATE → reset() → IDLE
//
// API (window.aicsResultBox):
//   create({id, type, collapsible, previewMax, generatingText, onStateChange})
//   instance.start([msg])        → IDLE → GENERATING (clears content, shows box)
//   instance.appendChunk(text)   → GENERATING (FULL += CHUNK, progressive UI update)
//   instance.complete([opts])    → GENERATING → COMPLETED (auto compact preview → COLLAPSED)
//   instance.expand()            → COLLAPSED → EXPANDED (full content visible)
//   instance.collapse()          → EXPANDED → COLLAPSED (compact preview only)
//   instance.reset()             → ANY → IDLE (clears content)
//   instance.setError(msg)       → GENERATING → ERROR (streamed content kept)
//   instance.getFullText()       → full content from internal state (never truncated)
//   instance.getState()          → current state
//
// Result types: 'text' (default) | 'image' | 'audio' | 'html'.
// Progressive streaming applies to 'text'; media results use
// complete() to transition directly to COMPLETED.
// ============================================================
export const AICS_RESULT_BOX_CSS = `
.aics-rbox{position:relative;width:100%;box-sizing:border-box;}
.aics-rbox-status{display:none;align-items:center;gap:8px;font-size:13px;color:#7c5cff;padding:8px 12px;border-radius:10px;background:rgba(124,92,255,.08);margin:0 0 8px;box-sizing:border-box;}
.aics-rbox-status.show{display:flex;}
.aics-rbox-status .aics-rbox-dot{width:12px;height:12px;border-radius:50%;border:2px solid rgba(124,92,255,.22);border-top-color:#7c5cff;animation:aicsRboxSpin .8s linear infinite;flex:none;}
@keyframes aicsRboxSpin{to{transform:rotate(360deg)}}
.aics-rbox-error{display:none;font-size:13px;color:#c0392b;background:rgba(192,57,43,.08);border:1px solid rgba(192,57,43,.18);padding:8px 12px;border-radius:10px;margin:0 0 8px;box-sizing:border-box;line-height:1.5;}
.aics-rbox-error.show{display:block;}
.aics-rbox-toggle{display:none;margin:8px auto 2px;padding:6px 16px;border:1px solid rgba(124,92,255,.35);background:#fff;color:#6b46d6;border-radius:20px;font-size:13px;cursor:pointer;transition:all .15s;}
.aics-rbox-toggle:hover{background:rgba(124,92,255,.08);}
.aics-rbox-toggle.show{display:block;}
.aics-rbox-target-text{transition:max-height .18s ease;}
`;

// Browser-side Global Result Box (injected into every studio page via shared.js)
export const AICS_RESULT_BOX_SCRIPT = `
(function () {
  var __aicsRboxReg = {};
  function aicsRboxEsc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function aicsRboxAutoGrow(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = (ta.scrollHeight + 2) + 'px';
  }
  function aicsRboxMake(o) {
    var target = document.getElementById(o.id);
    if (!target) return null;
    var wrap = document.createElement('div');
    wrap.className = 'aics-rbox';
    target.parentNode.insertBefore(wrap, target);
    wrap.appendChild(target);
    var status = document.createElement('div');
    status.className = 'aics-rbox-status';
    status.innerHTML = '<span class="aics-rbox-dot"></span><span class="aics-rbox-status-msg"></span>';
    wrap.appendChild(status);
    var errBox = document.createElement('div');
    errBox.className = 'aics-rbox-error';
    wrap.appendChild(errBox);
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'aics-rbox-toggle';
    toggle.textContent = 'Show More';
    toggle.addEventListener('click', function () {
      if (inst.state === 'COLLAPSED') inst.expand(); else if (inst.state === 'EXPANDED') inst.collapse();
    });
    wrap.appendChild(toggle);

    var isTextarea = target.tagName === 'TEXTAREA';
    var type = o.type || 'text';
    var collapsible = o.collapsible !== false;
    var previewMax = o.previewMax || 260;
    var generatingText = o.generatingText || 'AI ရေးသားနေသည်...';
    var fullText = '';
    var state = 'IDLE';
    var readOnlySaved = false;

    function setState(s) {
      state = s;
      if (typeof o.onStateChange === 'function') { try { o.onStateChange(s); } catch (e) {} }
    }
    function setStatus(show, msg) {
      if (show) {
        var m = status.querySelector('.aics-rbox-status-msg');
        if (m) m.textContent = msg || generatingText;
        status.classList.add('show');
      } else {
        status.classList.remove('show');
      }
    }
    function setError(msg) {
      errBox.textContent = msg || 'Generation failed. Please try again.';
      errBox.classList.add('show');
    }
    function setContent(text) {
      if (type === 'text') {
        if (isTextarea) target.value = text; else target.textContent = text;
      }
    }
    function clearContent() {
      setContent('');
      fullText = '';
    }
    function applyCollapsed() {
      if (!isTextarea) { target.style.maxHeight = previewMax + 'px'; target.style.overflow = 'hidden'; return; }
      target.style.height = '';
      target.style.maxHeight = previewMax + 'px';
      target.style.overflow = 'hidden';
    }
    function applyExpanded() {
      if (isTextarea) {
        target.style.maxHeight = 'none';
        target.style.overflow = 'hidden';
        aicsRboxAutoGrow(target);
      } else {
        target.style.maxHeight = 'none';
        target.style.overflow = 'visible';
      }
    }
    function fitPreview() {
      // Short content — compact preview is the full content (no toggle needed)
      if (!isTextarea) return true;
      target.style.height = '';
      target.style.maxHeight = previewMax + 'px';
      target.style.overflow = 'hidden';
      var over = target.scrollHeight > previewMax;
      target.style.maxHeight = '';
      target.style.overflow = '';
      return !over;
    }

    var inst = {
      _target: target,
      get id() { return o.id; },
      getState: function () { return state; },
      getFullText: function () { return fullText; },
      start: function (msg) {
        if (window.__aicsActiveStream && typeof window.__aicsActiveStream.abort === 'function') {
          try { window.__aicsActiveStream.abort(); } catch (e) {}
        }
        clearContent();
        setError('');
        errBox.classList.remove('show');
        toggle.classList.remove('show');
        toggle.textContent = 'Show More';
        if (isTextarea) {
          readOnlySaved = target.readOnly;
          target.readOnly = true;
        }
        setStatus(true, msg);
        setState('GENERATING');
        applyExpanded();
        return inst;
      },
      appendChunk: function (chunk) {
        if (state !== 'GENERATING') return inst;
        var t = chunk == null ? '' : String(chunk);
        if (!t) return inst;
        fullText += t;
        setContent(fullText);
        if (type === 'text') aicsRboxAutoGrow(target);
        return inst;
      },
      complete: function (opts) {
        if (state === 'IDLE' || state === 'GENERATING' || state === 'ERROR') {
          setStatus(false);
          if (isTextarea) target.readOnly = readOnlySaved;
          // Optional final content replacement (e.g. parsed prompt / media render)
          if (opts && opts.content != null) { fullText = String(opts.content); setContent(fullText); }
          setState('COMPLETED');
          if (type === 'text' && collapsible) {
            if (fitPreview()) {
              // fits — full view, no toggle
              applyExpanded();
              toggle.classList.remove('show');
            } else {
              inst.collapse();
            }
          } else {
            applyExpanded();
          }
        }
        return inst;
      },
      expand: function () {
        if (state !== 'COLLAPSED' && state !== 'COMPLETED') return inst;
        applyExpanded();
        toggle.textContent = 'Show Less';
        toggle.classList.add('show');
        setState('EXPANDED');
        return inst;
      },
      collapse: function () {
        if (state === 'IDLE' || state === 'GENERATING') return inst;
        if (type !== 'text') return inst;
        applyCollapsed();
        toggle.textContent = 'Show More';
        toggle.classList.add('show');
        setState('COLLAPSED');
        return inst;
      },
      setError: function (msg) {
        if (state === 'IDLE') return inst;
        setStatus(false);
        if (isTextarea) target.readOnly = readOnlySaved;
        setError(msg);
        setState('ERROR');
        // ERROR — streamed content is preserved (fullText untouched)
        if (type === 'text' && isTextarea) aicsRboxAutoGrow(target);
        return inst;
      },
      reset: function () {
        clearContent();
        setStatus(false);
        setError('');
        errBox.classList.remove('show');
        toggle.classList.remove('show');
        toggle.textContent = 'Show More';
        if (isTextarea) {
          target.readOnly = readOnlySaved;
          target.style.height = '';
          target.style.maxHeight = '';
          target.style.overflow = '';
        } else {
          target.style.maxHeight = '';
          target.style.overflow = '';
        }
        setState('IDLE');
        return inst;
      }
    };
    return inst;
  }
  window.aicsResultBox = {
    create: function (opts) {
      if (!opts || !opts.id) return null;
      // Stale instance (target re-rendered / detached) → re-create from fresh DOM
      var prev = __aicsRboxReg[opts.id];
      if (prev) {
        var alive = true;
        try { alive = !!prev._target && prev._target.isConnected; } catch (e) { alive = false; }
        if (!alive) delete __aicsRboxReg[opts.id];
        else return prev;
      }
      var inst = aicsRboxMake(opts);
      if (inst) __aicsRboxReg[opts.id] = inst;
      return inst;
    },
    get: function (id) { return __aicsRboxReg[id] || null; },
    destroy: function (id) { delete __aicsRboxReg[id]; }
  };
})();
`;

// ============================================================
// GLOBAL RESULT STREAMING — Shared NDJSON Stream Reader
// ------------------------------------------------------------
// Reads the backend ReadableStream (application/x-ndjson) via
// fetch() + getReader(), dispatches:
//   onChunk(text)   → one real AI text delta per event
//   onDone(result)  → final structured result {type:'done'}
//   onError(err)    → stream error event or network error
//   onAbort()       → user/abort cancellation
// Returns a promise with .abort(). A new stream automatically
// aborts the previous active one (no stuck GENERATING states).
// ============================================================
export const AICS_STREAM_SCRIPT = `
function aicsStreamCall(url, body, opts) {
  opts = opts || {};
  var tk = (typeof token !== 'undefined' && token) || (typeof TOKEN !== 'undefined' && TOKEN) || '';
  if (!tk) { try { tk = localStorage.getItem('aics_token') || ''; } catch (e) {} }
  var ctrl = new AbortController();
  if (window.__aicsActiveStream && typeof window.__aicsActiveStream.abort === 'function') {
    try { window.__aicsActiveStream.abort(); } catch (e) {}
  }
  function handleLine(line) {
    line = String(line || '').trim();
    if (!line) return;
    var ev;
    try { ev = JSON.parse(line); } catch (e) { return; }
    if (ev.type === 'chunk') {
      if (opts.onChunk) opts.onChunk(String(ev.text || ''));
    } else if (ev.type === 'done') {
      if (opts.onDone) opts.onDone(ev.result || {});
    } else if (ev.type === 'error') {
      var err = new Error(ev.message || 'Generation failed. Please try again.');
      err.code = ev.code || 'error';
      err.streamError = true;
      if (opts.onError) opts.onError(err);
    }
  }
  var p = fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk, 'Accept': 'application/x-ndjson' },
    body: JSON.stringify(body || {}),
    signal: ctrl.signal
  }).then(function (res) {
    if (!res.ok) {
      return res.json().catch(function () { return {}; }).then(function (d) {
        var err = new Error(d.detail || d.message || d.error || ('Request failed (' + res.status + ')'));
        err.code = d.error || ('http_' + res.status);
        err.status = res.status;
        throw err;
      });
    }
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buf = '';
    function pump() {
      return reader.read().then(function (r) {
        if (r.done) {
          var rem = buf; buf = '';
          if (rem && rem.trim()) handleLine(rem);
          return;
        }
        buf += decoder.decode(r.value, { stream: true });
        var lines = buf.split('\\n');
        buf = lines.pop();
        for (var i = 0; i < lines.length; i++) handleLine(lines[i]);
        return pump();
      });
    }
    return pump();
  }).catch(function (e) {
    if (e && e.name === 'AbortError') {
      if (opts.onAbort) opts.onAbort();
      return;
    }
    if (e && e.streamError) return; // already dispatched via onError
    if (opts.onError) opts.onError(e);
  });
  p.abort = function () { try { ctrl.abort(); } catch (e) {} };
  window.__aicsActiveStream = p;
  return p;
}
window.aicsStreamCall = aicsStreamCall;
`;
