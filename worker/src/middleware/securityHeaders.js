// Report-only rollout for the current HTML application shell.
// Inline scripts and event attributes still exist, so enforcement is deferred
// until those execution paths have been migrated to nonce/external scripts.
const HTML_CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "script-src-elem 'self'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ');

export function buildHtmlSecurityHeaders() {
  return {
    'Content-Security-Policy-Report-Only': HTML_CSP_REPORT_ONLY,
  };
}
