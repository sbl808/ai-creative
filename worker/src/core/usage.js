// Deprecated compatibility shim.
// User usage counters are browser-owned; the Worker must never persist them.
// Keep this export temporarily so any external import cannot write to D1.
async function trackUsage() {
  return undefined;
}

export { trackUsage };
