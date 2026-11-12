// RFID reader seam.
//
// The physical reader pushes each tag it reads into the system. Whatever
// carries that data (a WebSocket or SSE stream from the reader service, a
// keyboard-wedge script, a test) only has to call `emitTagRead(epc)` or
// dispatch a `rollflow:tag-read` event on `window` with `{ detail: { epc } }`.
// The interface subscribes with `subscribeToReader`.
//
// The preview has no hardware, so `simulateRead` makes up a tag number.

const listeners = new Set();

export function subscribeToReader(listener) {
  listeners.add(listener);
  const onEvent = (e) => e.detail?.epc && emitTagRead(e.detail.epc);
  window.addEventListener("rollflow:tag-read", onEvent);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("rollflow:tag-read", onEvent);
  };
}

export function emitTagRead(epc) {
  const read = { epc: String(epc).trim().toUpperCase(), at: Date.now() };
  listeners.forEach((listener) => listener(read));
}

// A plausible EPC in the same shape as the demo records.
export function simulateRead() {
  const digits = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");
  return "E200341201" + digits;
}
