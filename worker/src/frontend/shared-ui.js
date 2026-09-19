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
