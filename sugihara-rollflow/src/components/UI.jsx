import React, { useEffect, useRef, useState } from "react";
import { Radio, Search, X, LoaderCircle } from "lucide-react";

export const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Error feedback: a short horizontal shake of the element that was rejected.
export function shake(el) {
  if (!el || reducedMotion()) return;
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-7px)" },
      { transform: "translateX(5px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
}

export function Badge({ children }) {
  return (
    <span
      className={
        "badge " +
        (/Available|Received|Completed|Released|Connected/.test(children)
          ? "green"
          : /Transit|Pending|Issued|Disconnected|Low/.test(children)
            ? "amber"
            : "")
      }
    >
      {children}
    </span>
  );
}
export function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={"card " + className}>
      <div className="card-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// Renders a number and eases to each new value, bumping so a change in the
// data is noticed. It does not animate on first paint. Non-numeric values
// ("—") render as they are.
export function Count({ value }) {
  const match = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(String(value));
  const target = match ? Number(match[1]) : null;
  const [shown, setShown] = useState(target);
  const [bump, setBump] = useState(0);
  const from = useRef(target);
  const last = useRef(target);
  useEffect(() => {
    if (target == null) return;
    if (last.current !== target) setBump((b) => b + 1);
    last.current = target;
    if (reducedMotion()) {
      setShown(target);
      return;
    }
    const start = performance.now(),
      origin = from.current,
      duration = 650;
    let frame;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setShown(Math.round(origin + (target - origin) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Frames stop in a hidden tab, so always land on the real value.
    const settle = setTimeout(() => setShown(target), duration + 120);
    from.current = target;
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [target]);
  if (target == null) return <span className="count">{value}</span>;
  return (
    <span key={bump} className={bump ? "count bump" : "count"}>
      {shown}
      {match[2]}
    </span>
  );
}
export function KPI({ label, value, note }) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <strong>
        <Count value={value} />
      </strong>
      {note && <small>{note}</small>}
    </div>
  );
}
// `feedback` is { type: "ok" | "error", n } where n changes on every scan.
export function Scanner({ value, onChange, onScan, feedback }) {
  const input = useRef(null);
  useEffect(() => {
    if (feedback?.type === "error") shake(input.current);
  }, [feedback]);
  return (
    <div className="scanner">
      {feedback && (
        <i key={feedback.n} className={"scan-fx " + feedback.type} aria-hidden />
      )}
      <div className="scanner-label">
        <Radio size={18} />
        <strong>RFID scan station</strong>
      </div>
      <p>Reader offline · use a mock EPC to try this workflow.</p>
      <form
        className="scan-input"
        onSubmit={(e) => {
          e.preventDefault();
          onScan();
          input.current?.focus();
        }}
      >
        <input
          ref={input}
          aria-label="RFID EPC"
          placeholder="Scan or enter RFID EPC…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="submit">Add scan</button>
      </form>
    </div>
  );
}
// Rows open the roll on click; the Roll ID is a real button so the keyboard
// can do the same. `pulse` is a Set of Roll IDs to confirm with a green pulse.
export function Table({ rolls, onSelect, pulse }) {
  const body = useRef(null);
  const pulseKey = [...(pulse ?? [])].join();
  useEffect(() => {
    if (!pulseKey) return;
    body.current
      ?.querySelector("tr.pulse")
      ?.scrollIntoView({
        block: "nearest",
        behavior: reducedMotion() ? "auto" : "smooth",
      });
  }, [pulseKey]);
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {["Roll ID / EPC", "Model / Lot", "Length", "Location", "Status"].map(
              (h) => (
                <th key={h}>{h}</th>
              ),
            )}
          </tr>
        </thead>
        <tbody ref={body}>
          {rolls.map((r) => (
            <tr
              key={r.id}
              className={"clickable" + (pulse?.has(r.id) ? " pulse" : "")}
              onClick={() => onSelect(r)}
            >
              <td>
                <button className="text-button mono">{r.id}</button>
                <small className="subtext mono">
                  {r.epc || "Tag released"}
                </small>
              </td>
              <td>
                <b>{r.model}</b>
                <small className="subtext">{r.lot}</small>
              </td>
              <td>{r.length} m</td>
              <td>{r.location}</td>
              <td>
                <Badge>{r.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rolls.length && <div className="empty">No rolls match this view.</div>}
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search Roll ID, EPC, model or lot…",
}) {
  return (
    <label className="search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
// Children may be a function receiving `close`, which plays the exit
// animation before the dialog is removed.
export function Dialog({ title, onClose, children }) {
  const [closing, setClosing] = useState(false);
  const timer = useRef();
  const close = () => {
    if (closing) return;
    if (reducedMotion()) return onClose();
    setClosing(true);
    timer.current = setTimeout(onClose, 170);
  };
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div
      className={"modal-backdrop" + (closing ? " closing" : "")}
      onClick={close}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button
            aria-label="Close dialog"
            className="icon-button"
            onClick={close}
          >
            <X />
          </button>
        </header>
        {typeof children === "function" ? children(close) : children}
      </section>
    </div>
  );
}
export function Loading() {
  return (
    <div className="empty">
      <LoaderCircle className="spin" /> Loading records…
    </div>
  );
}
