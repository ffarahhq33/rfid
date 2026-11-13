import React, { useCallback, useEffect, useRef, useState } from "react";
import { Radio, Check, AlertTriangle } from "lucide-react";
import { shake } from "./UI";
import { Skeleton } from "./Skeleton";
import { checkTag, loadStation0LatestScan } from "../data/api";
import { emitTagRead, simulateRead, subscribeToReader } from "../data/reader";

// Holds the tag the reader most recently sent.
//
// States: "checking" (shown the moment it arrives, verification running),
// "ready" (free to register), "duplicate" (held by another roll) and
// "registered". The tag is shown optimistically: the operator sees it at once
// and the check only changes its status afterwards.
export function useCurrentTag(rolls, { enabled = true, onRead } = {}) {
  const [tag, setTag] = useState(null);
  const latest = useRef({ rolls, onRead });
  latest.current = { rolls, onRead };
  const seq = useRef(0);

  const receive = useCallback(async ({ epc, at }) => {
    const n = ++seq.current;
    setTag({ epc, at, n, state: "checking" });
    latest.current.onRead?.(epc);
    let result;
    try {
      result = await checkTag(epc, latest.current.rolls);
    } catch {
      result = { available: true }; // saving validates again
    }
    if (seq.current !== n) return; // a newer read replaced this one
    setTag((t) =>
      t?.n === n
        ? {
            ...t,
            state: result.available === null ? "unverified" : result.available ? "ready" : "duplicate",
            rollId: result.rollId,
          }
        : t,
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;
    return subscribeToReader(receive);
  }, [enabled, receive]);

  // Read latest real EPC from the existing Station 0 Node.js reader inbox.
  // Only run on Station 0; do not affect other station pages.
  const lastScanKey = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let running = false;

    async function poll() {
      if (running || stopped) return;
      running = true;
      try {
        const scan = await loadStation0LatestScan();
        if (!scan || stopped) return;
        // Same EPC may be scanned again later; prefer backend scan timestamp.
        const key = scan.epc + ':' + String(scan.at ?? '');
        if (lastScanKey.current === key) return;
        lastScanKey.current = key;
        // Receive via the existing reader event pathway used by the UI.
        emitTagRead(scan.epc);
      } catch (error) {
        // Transient reader/API errors must not clear the operator's form.
        if (!stopped) console.warn('[Station 0 RFID]', error.message);
      } finally {
        running = false;
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => { stopped = true; clearInterval(interval); };
  }, [enabled]);

  return { tag, setTag, clear: () => setTag(null) };
}

const groups = (epc) => epc.match(/.{1,4}/g) ?? [];
const clock = (at) =>
  new Date(at).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function Status({ tag }) {
  const state = tag?.state ?? "waiting";
  if (state === "checking")
    return (
      <span className="tag-status info" key={state}>
        <Skeleton w="6.5rem" h="0.75rem" />
        <span className="sr-only">Checking tag</span>
      </span>
    );
  if (state === "ready")
    return (
      <span className="tag-status ok" key={state}>
        <Check size={14} strokeWidth={3} /> New tag · ready to register
      </span>
    );
  if (state === "duplicate")
    return (
      <span className="tag-status danger" key={state}>
        <AlertTriangle size={14} /> Already assigned to {tag.rollId}
      </span>
    );
  if (state === "unverified")
    return (
      <span className="tag-status info" key={state}>
        <AlertTriangle size={14} /> Cannot verify EPC · registration will validate
      </span>
    );
  if (state === "registered")
    return (
      <span className="tag-status ok" key={state}>
        <Check size={14} strokeWidth={3} /> Registered as {tag.rollId}
      </span>
    );
  return (
    <span className="tag-status info" key={state}>
      Waiting for reader
    </span>
  );
}

export default function TagReader({ tag, onClear }) {
  const box = useRef(null);
  const state = tag?.state ?? "waiting";
  useEffect(() => {
    if (state === "duplicate") shake(box.current);
  }, [state, tag?.n]);
  let index = 0;
  return (
    // Re-keyed per read so the arrival animation plays for every tag.
    <section
      key={tag?.n ?? 0}
      ref={box}
      className={"tag-reader " + state}
      aria-label="Current tag"
    >
      <div className="tag-reader-head">
        <h2>Current tag</h2>
        <div aria-live="polite">
          <Status tag={tag} />
        </div>
      </div>
      <div className="tag-number" aria-label={tag ? "Tag " + tag.epc : "No tag"}>
        {tag ? (
          groups(tag.epc).map((group, g) => (
            <span className="tag-group" key={g} aria-hidden="true">
              {[...group].map((char, c) => (
                <span className="tag-char" style={{ "--i": index++ }} key={c}>
                  {char}
                </span>
              ))}
            </span>
          ))
        ) : (
          <span className="tag-placeholder">Place a tag on the reader</span>
        )}
      </div>
      <div className="tag-reader-foot">
        <span className="subtle">
          {tag
            ? "Received " + clock(tag.at)
            : "Waiting for RFID reader scan"}
        </span>
        <div className="tag-actions">
          {tag && (
            <button className="text-button" type="button" onClick={onClear}>
              Clear
            </button>
          )}
          <button
            className="secondary"
            type="button"
            onClick={() => emitTagRead(simulateRead())}
          >
            <Radio size={16} /> Simulate tag read
          </button>
        </div>
      </div>
    </section>
  );
}
