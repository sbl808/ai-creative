// ============================================================
// AI CREATIVE STUDIO — Usage Service
// ------------------------------------------------------------
// H6: User usage data must not be stored in server-side storage.
// Usage tracking is intentionally disabled; keep this function and
// its arguments to preserve existing route interfaces without D1 writes.
// Browser-side counters and rate limiting are handled separately.
// ============================================================

async function trackUsage(_env, _userId, _category, _amount) {
  // Intentionally no-op: never write user usage data to D1 or server logs.
}

export { trackUsage };
