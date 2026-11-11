import React from "react";
import { Radio, Search, X, ArrowUpRight, LoaderCircle } from "lucide-react";
export function Badge({ children }) {
  return (
    <span
      className={
        "badge " +
        (/Available|Received|Completed|Released|Connected/.test(children)
          ? "green"
          : /Transit|Pending|Issued|Disconnected/.test(children)
            ? "amber"
            : "purple")
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
export function KPI({ label, value, note, icon: Icon }) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span>{label}</span>
        <div className="icon-box">
          <Icon size={19} />
        </div>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
export function Scanner({ value, onChange, onScan }) {
  return (
    <div className="scanner">
      <div className="scanner-label">
        <Radio size={18} />
        <strong>RFID scan station</strong>
        <Badge>Disconnected</Badge>
      </div>
      <p>Reader offline · use a mock EPC to try this workflow.</p>
      <div className="scan-input">
        <input
          aria-label="RFID EPC"
          placeholder="Scan or enter RFID EPC…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button onClick={onScan}>Add scan</button>
      </div>
    </div>
  );
}
export function Table({ rolls, onSelect }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {[
              "Roll ID / EPC",
              "Model / Lot",
              "Length",
              "Location",
              "Status",
              "",
            ].map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rolls.map((r) => (
            <tr key={r.id}>
              <td>
                <button
                  className="text-button mono"
                  onClick={() => onSelect(r)}
                >
                  {r.id}
                </button>
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
              <td>
                <button
                  className="icon-button"
                  aria-label={"View " + r.id}
                  onClick={() => onSelect(r)}
                >
                  <ArrowUpRight size={17} />
                </button>
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
export function Dialog({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
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
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        {children}
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
