import React, { useRef, useState } from "react";
import { Download, Plus } from "lucide-react";
import {
  Card,
  KPI,
  Badge,
  Scanner,
  Table,
  SearchBox,
  Count,
  shake,
} from "../components/UI";
import TagReader, { useCurrentTag } from "../components/TagReader";
import { saveRollChanges, saveNewRoll } from "../data/api";
export default function Stations({
  page,
  rolls,
  commit,
  pulse,
  notify,
  select,
  threshold,
  setThreshold,
  events,
  confirm,
}) {
  const [query, setQuery] = useState(""),
    [epc, setEpc] = useState(""),
    [selected, setSelected] = useState([]),
    [model, setModel] = useState("All models"),
    [tab, setTab] = useState("Inventory"),
    [location, setLocation] = useState("SDY-B01"),
    [scanFx, setScanFx] = useState(null),
    [epcValue, setEpcValue] = useState(""),
    [epcInvalid, setEpcInvalid] = useState(false),
    epcField = useRef(null);
  // A tag read by the reader fills the form straight away.
  const { tag, setTag, clear } = useCurrentTag(rolls, {
    enabled: page === 1,
    onRead: (epc) => {
      setEpcValue(epc);
      setEpcInvalid(false);
    },
  });
  const filtered = rolls.filter(
    (r) =>
      [r.id, r.epc, r.model, r.lot]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (model === "All models" || r.model === model),
  );
  const update = (ids, patch, action) => {
    const site = page === 3 ? "PK" : "SDY";
    commit({
      apply: (prev) =>
        prev.map((r) => (ids.includes(r.id) ? { ...r, ...patch } : r)),
      entries: ids.map((id) => ({
        action:
          action +
          (action === "RFID tag released"
            ? " · EPC " + rolls.find((r) => r.id === id).epc
            : ""),
        id,
        site,
      })),
      persist: () => saveRollChanges(ids, patch),
      success: action + " · demo records updated",
      ids,
    });
    setSelected([]);
    setEpc("");
  };
  const reject = (message) => {
    setScanFx((fx) => ({ type: "error", n: (fx?.n ?? 0) + 1 }));
    notify(message, "error");
  };
  function scan(status) {
    const r = rolls.find(
      (r) => r.epc?.toUpperCase() === epc.trim().toUpperCase(),
    );
    if (!r) return reject("Unknown EPC. No matching roll in demo records.");
    if (!status.includes(r.status))
      return reject("This roll is not eligible for this operation.");
    if (selected.includes(r.id))
      return reject("Duplicate scan: roll is already selected.");
    setSelected([...selected, r.id]);
    setScanFx((fx) => ({ type: "ok", n: (fx?.n ?? 0) + 1, id: r.id }));
    setEpc("");
  }
  const controls = (
    <div className="filters">
      <SearchBox value={query} onChange={setQuery} />
      <select
        aria-label="Filter model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      >
        {["All models", "D27A", "D38L", "P15B", "D42N"].map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <span className="subtle">{filtered.length} matching rolls</span>
    </div>
  );
  const batch = (title, description, button, action, eligible) => (
    <>
      <Scanner
        value={epc}
        onChange={setEpc}
        onScan={() => scan(eligible)}
        feedback={scanFx}
      />
      <Card title={title} subtitle={description}>
        <p className="hint">{selected.length} selected</p>
        <Table
          rolls={rolls.filter((r) => selected.includes(r.id))}
          onSelect={select}
          pulse={
            scanFx?.type === "ok" && selected.includes(scanFx.id)
              ? new Set([scanFx.id])
              : undefined
          }
        />
        <div className="panel-foot">
          <button className="secondary" onClick={() => setSelected([])}>
            Clear selection
          </button>
          <button
            disabled={!selected.length}
            onClick={() =>
              confirm(
                button,
                `${selected.length} selected roll(s). This changes demo data only.`,
                action,
              )
            }
          >
            {button}
          </button>
        </div>
      </Card>
    </>
  );
  if (page === 1)
    return (
      <>
        <TagReader
          tag={tag}
          onClear={() => {
            clear();
            setEpcValue("");
            setEpcInvalid(false);
          }}
        />
        <Card
          title="New roll registration"
          subtitle="Permanent Roll ID · reusable RFID association"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.target));
              if (
                rolls.some(
                  (r) => r.epc?.toUpperCase() === data.epc.toUpperCase(),
                )
              ) {
                const field = epcField.current;
                setEpcInvalid(true);
                field.focus();
                shake(field);
                return notify(
                  "EPC is already assigned to an active roll.",
                  "error",
                );
              }
              const id = `RF-PK-20261110-${String(rolls.length + 1).padStart(4, "0")}`;
              const roll = {
                ...data,
                epc: data.epc.toUpperCase(),
                id,
                length: Number(data.length),
                status: "Available",
              };
              // Optimistic: the tag box confirms at once; a failed save puts it back.
              setTag((t) =>
                t && t.epc === roll.epc
                  ? { ...t, state: "registered", rollId: id }
                  : t,
              );
              commit({
                apply: (prev) => [...prev, roll],
                entries: [{ action: "Roll registered", id, site: "PK" }],
                persist: () => saveNewRoll(roll),
                success: "Demo roll registered: " + id,
                ids: [id],
              }).then((saved) => {
                if (!saved)
                  setTag((t) =>
                    t?.rollId === id
                      ? { ...t, state: "ready", rollId: undefined }
                      : t,
                  );
              });
              e.target.reset();
              setEpcValue("");
            }}
          >
            <div className="form-grid">
              <label>
                Roll ID
                <input
                  disabled
                  value="Assigned automatically on registration"
                />
              </label>
              <label>
                RFID EPC
                <input
                  ref={epcField}
                  name="epc"
                  value={epcValue}
                  aria-invalid={
                    epcInvalid || tag?.state === "duplicate" || undefined
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    setEpcValue(value);
                    setEpcInvalid(false);
                    // Typing a different number means it is no longer the tag read.
                    if (tag && value.trim().toUpperCase() !== tag.epc) clear();
                  }}
                  required
                  pattern="[A-Fa-f0-9]{8,64}"
                  placeholder="Enter 8–64 hexadecimal characters"
                />
              </label>
              <label>
                Model code
                <select name="model">
                  {["D27A", "D38L", "P15B", "D42N"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                Lot number
                <input name="lot" required placeholder="e.g. LOT-261110-04" />
              </label>
              <label>
                Roll length (m)
                <input
                  type="number"
                  name="length"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="250"
                />
              </label>
              <label>
                PK storage location
                <select name="location">
                  <option>PK-A01</option>
                  <option>PK-A02</option>
                  <option>PK-A03</option>
                </select>
              </label>
            </div>
            <div className="panel-foot">
              <span className="subtle">
                Demo ID only. Production IDs will be generated by the backend.
              </span>
              <button type="submit" disabled={tag?.state === "duplicate"}>
                <Plus size={16} /> Register roll
              </button>
            </div>
          </form>
        </Card>
        <Card title="Registered rolls">
          {controls}
          <Table rolls={filtered} onSelect={select} pulse={pulse} />
        </Card>
      </>
    );
  if (page === 2)
    return (
      <>
        <div className="kpi-grid three">
          <KPI
            label="Available rolls"
            value={rolls.filter((r) => r.status === "Available").length}
          />
          <KPI
            label="Models in stock"
            value={
              new Set(
                rolls
                  .filter((r) => r.status === "Available")
                  .map((r) => r.model),
              ).size
            }
          />
          <KPI
            label="Total available length"
            value={
              rolls
                .filter((r) => r.status === "Available")
                .reduce((s, r) => s + r.length, 0) + " m"
            }
          />
        </div>
        <Card
          title="PK roll inventory"
          subtitle="Select a Roll ID to inspect its details"
        >
          {controls}
          <Table
            rolls={filtered.filter((r) => r.status === "Available")}
            onSelect={select}
            pulse={pulse}
          />
        </Card>
      </>
    );
  if (page === 3)
    return (
      <>
        <Card
          title="Shipment details"
          subtitle="Destination · Sendayan Roll Storage Area"
        >
          <div className="form-grid">
            <label>
              Shipment reference
              <input readOnly value="DSP-PK-DEMO" />
            </label>
            <label>
              Vehicle / transport reference
              <input placeholder="e.g. BKL 2801" />
            </label>
          </div>
        </Card>
        {batch(
          "Dispatch selection",
          "Only available PK rolls can be dispatched.",
          "Confirm dispatch",
          () =>
            update(
              selected,
              { status: "In Transit", location: "In transit" },
              "Roll dispatched",
            ),
          ["Available"],
        )}
        <Card
          title="Eligible PK rolls"
          subtitle="Copy an EPC to add a mock scan"
        >
          <Table
            rolls={rolls.filter((r) => r.status === "Available")}
            onSelect={select}
            pulse={pulse}
          />
        </Card>
      </>
    );
  if (page === 4)
    return (
      <>
        <Card
          title="Incoming shipment"
          subtitle="DSP-PK-0008 · Port Klang → Sendayan"
        >
          <div className="receipt-summary">
            <div>
              <strong>
                <Count
                  value={rolls.filter((r) => r.status === "In Transit").length}
                />
              </strong>
              <span>Pending rolls</span>
            </div>
            <label>
              Receiving location
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option>SDY-B01</option>
                <option>SDY-B02</option>
                <option>SDY-B03</option>
              </select>
            </label>
          </div>
        </Card>
        {batch(
          "Receiving verification",
          "Unknown and duplicate EPCs show an exception. Pending rolls remain in transit.",
          "Confirm receipt",
          () =>
            update(
              selected,
              { status: "Received", location },
              "Roll received at SDY",
            ),
          ["In Transit"],
        )}
        <Card
          title="Expected rolls"
          subtitle="Pending receipt does not mean missing"
        >
          <Table
            rolls={rolls.filter((r) => r.status === "In Transit")}
            onSelect={select}
            pulse={pulse}
          />
        </Card>
      </>
    );
  if (page === 5)
    return (
      <>
        <div className="tabs">
          {["Inventory", "Issue to production", "Complete consumption"].map(
            (t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => {
                  setTab(t);
                  setSelected([]);
                }}
              >
                {t}
              </button>
            ),
          )}
        </div>
        {tab === "Inventory" ? (
          <>
            <div className="kanban">
              {["D27A", "D38L", "P15B", "D42N"].map((m) => {
                const count = rolls.filter(
                  (r) => r.model === m && r.status === "Received",
                ).length;
                return (
                  <Card
                    key={m}
                    title={m}
                    action={
                      count < threshold ? <Badge>Low stock</Badge> : undefined
                    }
                  >
                    <strong className="stock-number">
                      <Count value={count} />
                      <small> rolls</small>
                    </strong>
                    <div className="stock-track">
                      <i
                        style={{
                          width: Math.min((count / threshold) * 100, 100) + "%",
                        }}
                      />
                    </div>
                    <p className="subtle">
                      Minimum {threshold} rolls ·{" "}
                      {
                        rolls.filter(
                          (r) => r.model === m && r.status === "In Transit",
                        ).length
                      }{" "}
                      incoming
                    </p>
                  </Card>
                );
              })}
            </div>
            <Card title="SDY inventory">
              {controls}
              <Table
                rolls={filtered.filter((r) => r.status === "Received")}
                onSelect={select}
                pulse={pulse}
              />
            </Card>
          </>
        ) : (
          <>
            {batch(
              tab,
              tab === "Issue to production"
                ? "Release stock to production. This does not mark consumption complete."
                : "Confirm that production has consumed these rolls.",
              tab === "Issue to production"
                ? "Confirm production issue"
                : "Mark consumed",
              () =>
                update(
                  selected,
                  {
                    status:
                      tab === "Issue to production" ? "Issued" : "Completed",
                    location: "SDY Production",
                  },
                  tab === "Issue to production"
                    ? "Issued to production"
                    : "Consumption completed",
                ),
              tab === "Issue to production" ? ["Received"] : ["Issued"],
            )}
            <Card title="Eligible rolls">
              <Table
                rolls={rolls.filter(
                  (r) =>
                    r.status ===
                    (tab === "Issue to production" ? "Received" : "Issued"),
                )}
                onSelect={select}
                pulse={pulse}
              />
            </Card>
          </>
        )}
      </>
    );
  if (page === 6)
    return (
      <>
        {batch(
          "Tag release",
          "Only consumed rolls qualify. Permanent roll records and events are retained.",
          "Release tags for reuse",
          () =>
            update(
              selected,
              { status: "Released", epc: "" },
              "RFID tag released",
            ),
          ["Completed"],
        )}
        <Card
          title="Eligible completed rolls"
          subtitle="Software assignment release only · physical readers are disconnected"
        >
          <Table
            rolls={rolls.filter((r) => r.status === "Completed")}
            onSelect={select}
            pulse={pulse}
          />
        </Card>
      </>
    );
  if (page === 7) {
    const exportCSV = () => {
      const rows = [
        ["Roll ID", "EPC", "Model", "Lot", "Length", "Location", "Status"],
        ...filtered.map((r) => [
          r.id,
          r.epc,
          r.model,
          r.lot,
          r.length,
          r.location,
          r.status,
        ]),
      ];
      const csv = rows
        .map((row) =>
          row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
        )
        .join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "rollflow-demo-inventory.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    };
    return (
      <>
        <Card
          title="Roll traceability & inventory"
          subtitle="Search permanent Roll IDs or currently assigned EPCs"
          action={
            <button className="secondary" onClick={exportCSV}>
              <Download size={16} /> Export CSV
            </button>
          }
        >
          {controls}
          <Table rolls={filtered} onSelect={select} pulse={pulse} />
        </Card>
        <Card
          title="Movement history"
          subtitle="Demo events retained independently of tag assignments"
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Roll / reference</th>
                  <th>Site</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={e.k ?? i} style={{ "--i": 0 }}>
                    <td>{e.time}</td>
                    <td>{e.action}</td>
                    <td className="mono">{e.id}</td>
                    <td>{e.site}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    );
  }
  return (
    <>
      <Card
        title="Inventory configuration"
        subtitle="Settings affect this demo session only"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setThreshold(Number(new FormData(e.target).get("threshold")));
            notify("Demo stock threshold updated", "success");
          }}
        >
          <div className="form-grid">
            <label>
              Minimum SDY stock per model
              <input
                name="threshold"
                type="number"
                min="1"
                max="10000"
                defaultValue={threshold}
                required
              />
            </label>
            <label>
              Operational timezone
              <input readOnly value="Asia/Kuala_Lumpur" />
            </label>
          </div>
          <button>Save demo settings</button>
        </form>
      </Card>
      <div className="dashboard-grid">
        <Card
          title="Users & roles"
          subtitle="Role examples · authentication is not connected"
        >
          <div className="settings-row">
            <div>
              <strong>Demo Operator</strong>
              <p>All station previews</p>
            </div>
            <span className="subtle">Demo access</span>
          </div>
          <p className="hint">
            Production roles and permissions will be supplied by your backend
            team.
          </p>
        </Card>
        <Card
          title="RFID configuration"
          subtitle="No hardware connections enabled"
        >
          <div className="settings-row">
            <span>PK registration reader</span>
            <Badge>Disconnected</Badge>
          </div>
          <div className="settings-row">
            <span>SDY receiving reader</span>
            <Badge>Disconnected</Badge>
          </div>
        </Card>
      </div>
    </>
  );
}
