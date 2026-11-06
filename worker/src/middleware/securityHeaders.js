// Keep the rollout in report-only mode until inline HTML has been migrated.
const HTML_CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src-attr 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
];

export function createCspNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function buildHtmlSecurityHeaders(nonce) {
  if (typeof nonce !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(nonce)) {
    throw new TypeError('invalid_csp_nonce');
  }

  const policy = HTML_CSP_DIRECTIVES.concat([
    `script-src 'self' 'nonce-${nonce}'`,
    `script-src-elem 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
  ]).join('; ');

  return {
    'Content-Security-Policy-Report-Only': policy,
  };
}
