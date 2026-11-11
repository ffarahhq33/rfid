import React, { useState } from "react";
import {
  Package,
  Truck,
  CheckCircle,
  RotateCcw,
  Download,
  Plus,
} from "lucide-react";
import { Card, KPI, Badge, Scanner, Table, SearchBox } from "../components/UI";
export default function Stations({
  page,
  rolls,
  setRolls,
  record,
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
    [location, setLocation] = useState("SDY-B01");
  const filtered = rolls.filter(
    (r) =>
      [r.id, r.epc, r.model, r.lot]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (model === "All models" || r.model === model),
  );
  const update = (ids, patch, action) => {
    setRolls((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, ...patch } : r)),
    );
    ids.forEach((id) =>
      record(
        action +
          (action === "RFID tag released"
            ? " · EPC " + rolls.find((r) => r.id === id).epc
            : ""),
        id,
        page === 3 ? "PK" : "SDY",
      ),
    );
    setSelected([]);
    setEpc("");
    notify(action + " · demo records updated");
  };
  function scan(status) {
    const r = rolls.find(
      (r) => r.epc?.toUpperCase() === epc.trim().toUpperCase(),
    );
    if (!r) return notify("Unknown EPC. No matching roll in demo records.");
    if (!status.includes(r.status))
      return notify("This roll is not eligible for this operation.");
    if (selected.includes(r.id))
      return notify("Duplicate scan: roll is already selected.");
    setSelected([...selected, r.id]);
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
      <Scanner value={epc} onChange={setEpc} onScan={() => scan(eligible)} />
      <Card title={title} subtitle={description}>
        <p className="hint">
          Try a mock EPC from the eligible rolls below. {selected.length}{" "}
          selected.
        </p>
        <Table
          rolls={rolls.filter((r) => selected.includes(r.id))}
          onSelect={select}
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
        <Card
          title="New roll registration"
          subtitle="Permanent Roll ID · reusable RFID association"
          action={<Badge>Demo form</Badge>}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.target));
              if (
                rolls.some(
                  (r) => r.epc?.toUpperCase() === data.epc.toUpperCase(),
                )
              )
                return notify("EPC is already assigned to an active roll.");
              const id = `RF-PK-20261110-${String(rolls.length + 1).padStart(4, "0")}`;
              setRolls([
                ...rolls,
                {
                  ...data,
                  epc: data.epc.toUpperCase(),
                  id,
                  length: Number(data.length),
                  status: "Available",
                },
              ]);
              record("Roll registered", id, "PK");
              notify("Demo roll registered: " + id);
              e.target.reset();
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
                  name="epc"
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
              <button type="submit">
                <Plus size={16} /> Register roll
              </button>
            </div>
          </form>
        </Card>
        <Card title="Registered rolls" subtitle="All mock roll records">
          {controls}
          <Table rolls={filtered} onSelect={select} />
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
            note="Currently at Port Klang"
            icon={Package}
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
            note="Distinct material models"
            icon={Package}
          />
          <KPI
            label="Total available length"
            value={
              rolls
                .filter((r) => r.status === "Available")
                .reduce((s, r) => s + r.length, 0) + " m"
            }
            note="Available rolls only"
            icon={Truck}
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
          action={<Badge>Pending receipt</Badge>}
        >
          <div className="receipt-summary">
            <div>
              <strong>
                {rolls.filter((r) => r.status === "In Transit").length}
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
                    subtitle="Available SDY stock"
                    action={
                      <Badge>
                        {count < threshold ? "Low stock" : "Available"}
                      </Badge>
                    }
                  >
                    <strong className="stock-number">
                      {count}
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
          <Table rolls={filtered} onSelect={select} />
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
                  <tr key={i}>
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
            notify("Demo stock threshold updated");
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
            <Badge>Demo access</Badge>
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
