// AI Creative Studio — GLOBAL RESULT STREAMING — Shared NDJSON Response Helper
// -----------------------------------------------------------------------------
// Wraps an async generator callback into a Cloudflare Worker Response whose body
// is a ReadableStream of newline-delimited JSON (NDJSON) events:
//
//   { "type": "chunk", "text": "..." }    one per AI text delta (real streaming)
//   { "type": "done",  "result": {...} }  final structured result (parsed)
//   { "type": "error", "code": "...", "message": "..." }
//
// The frontend reads the body with fetch() → ReadableStream → Stream Reader and
// appends each chunk to the Global Result Component. It NEVER waits for the full
// response before rendering.
//
// run(send): async callback that performs the AI call and calls send({...}) as
// events become available. Errors thrown inside run() are emitted as error
// events (streamed content already sent is preserved on the client).
export function ndjsonResponse(run, cors) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')); }
        catch (e) { /* controller already closed */ }
      };
      try {
        await run(send);
      } catch (e) {
        try {
          send({
            type: 'error',
            code: (e && e.code) || 'error',
            message: (e && e.message) || 'Something went wrong. Please try again.',
          });
        } catch (_) { /* ignore */ }
      }
      try { controller.close(); } catch (e) { /* ignore */ }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      ...(cors || {}),
    },
  });
}
