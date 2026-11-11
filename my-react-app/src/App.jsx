import { useEffect, useMemo, useState } from "react";
import "./App.css";

const REFRESH_MS = 3000;

const NAV_ITEMS = [
  { key: "overview", label: "Management Overview" },
  { key: "live", label: "Live RFID Monitor" },
  { key: "inventory", label: "Roll Inventory" },
  { key: "shipments", label: "PK → SDY Shipments" },
  { key: "exception", label: "Exception Monitor" },
  { key: "analytics", label: "Shipment Analytics" },
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getApiBase() {
  const host = window.location.hostname;
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:3001";
  }
  return `http://${host}:3001`;
}

function displayRollStatus(roll) {
  if (!roll) return "—";
  const status = String(roll.status || "").toUpperCase();
  const shipId = String(roll.ship_id || "").trim();

  if (status === "REGISTERED" && !shipId) return "ELIGIBLE";
  if (status === "OUT") return "DISPATCHED";
  return status || "—";
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "ELIGIBLE" || s === "ONLINE" || s === "READY") return "green";
  if (s === "OUT" || s === "DISPATCHED" || s === "OUTBOUND") return "amber";
  if (s === "PENDING") return "purple";
  return "slate";
}

function KpiCard({ label, value, subtext, accent = "blue" }) {
  return (
    <div className={`kpi-card accent-${accent}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-subtext">{subtext}</div>
    </div>
  );
}

function SectionCard({ title, eyebrow, right, children, className = "" }) {
  return (
    <section className={`section-card ${className}`}>
      <div className="section-head">
        <div>
          {eyebrow ? <div className="section-eyebrow">{eyebrow}</div> : null}
          <h3 className="section-title">{title}</h3>
        </div>
        {right ? <div className="section-right">{right}</div> : null}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

function Badge({ children, tone = "slate" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function App() {
  const [view, setView] = useState("overview");
  const [factoryMode, setFactoryMode] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [rollsData, setRollsData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [search, setSearch] = useState("");

  const apiBase = getApiBase();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "f") {
        setFactoryMode((prev) => !prev);
      }
      if (e.key === "Escape") {
        setFactoryMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        if (loading) setLoading(true);

        const [statusRes, dashboardRes, rollsRes] = await Promise.all([
          fetch(`${apiBase}/api/status`),
          fetch(`${apiBase}/api/station2/dashboard`),
          fetch(`${apiBase}/api/station2/rolls`),
        ]);

        if (!statusRes.ok || !dashboardRes.ok || !rollsRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [statusJson, dashboardJson, rollsJson] = await Promise.all([
          statusRes.json(),
          dashboardRes.json(),
          rollsRes.json(),
        ]);

        if (!active) return;

        setStatusData(statusJson);
        setDashboardData(dashboardJson);
        setRollsData(rollsJson);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to connect backend");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, REFRESH_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [apiBase, loading]);

  const scannedBatch = safeArray(dashboardData?.rolls);
  const shipments = safeArray(dashboardData?.shipments);
  const allRolls = safeArray(rollsData?.rolls);

  const availableRolls = useMemo(() => {
    return allRolls.filter((roll) => {
      const status = String(roll.status || "").toUpperCase();
      const shipId = String(roll.ship_id || "").trim();
      return status === "REGISTERED" && !shipId;
    });
  }, [allRolls]);

  const scannedCount = dashboardData?.scannedRolls ?? scannedBatch.length;
  const availableCount = dashboardData?.inventoryRolls ?? availableRolls.length;
  const shipmentsOutCount =
    dashboardData?.shipmentsOnRoad ??
    shipments.filter((s) => String(s.status || "").toUpperCase() === "OUT").length;
  const receivedAtSdyCount = shipments.filter((s) => {
    const st = String(s.status || "").toUpperCase();
    return st === "RECEIVED" || st === "IN";
  }).length;

  const kpis = [
    {
      label: "Scanned Rolls",
      value: scannedCount,
      subtext: "Current Gate A batch",
      accent: "blue",
    },
    {
      label: "Available at PK",
      value: availableCount,
      subtext: "Registered stock",
      accent: "green",
    },
    {
      label: "Shipments Out",
      value: shipmentsOutCount,
      subtext: "Outbound shipment count",
      accent: "amber",
    },
    {
      label: "Received at SDY",
      value: receivedAtSdyCount > 0 ? receivedAtSdyCount : "—",
      subtext: "Integration pending",
      accent: "purple",
    },
  ];

  const recentBatch = useMemo(() => {
    return [...scannedBatch]
      .sort((a, b) => {
        const aTime = new Date(a.scannedAt || 0).getTime();
        const bTime = new Date(b.scannedAt || 0).getTime();
        return bTime - aTime;
      });
  }, [scannedBatch]);

  const recentFactoryRows = recentBatch.slice(0, 5);

  const latestScan = recentBatch[0] || null;

  const inventoryByModel = useMemo(() => {
    const map = new Map();
    allRolls.forEach((roll) => {
      const model = roll.model_code || "UNKNOWN";
      map.set(model, (map.get(model) || 0) + 1);
    });

    return [...map.entries()]
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);
  }, [allRolls]);

  const filteredInventory = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return allRolls;

    return allRolls.filter((roll) => {
      return [
        roll.epc,
        roll.serial,
        roll.model_code,
        roll.lot_no,
        roll.status,
        roll.ship_id,
      ]
        .map((x) => String(x || "").toLowerCase())
        .some((x) => x.includes(keyword));
    });
  }, [allRolls, search]);

  const exceptions = useMemo(() => {
    const items = [];

    if (error) {
      items.push("Backend/API communication issue detected.");
    }

    if (!statusData || statusData.status !== "ONLINE") {
      items.push("Windows Node.js API is not online.");
    }

    if (receivedAtSdyCount === 0) {
      items.push("Sendayan receiving integration is still pending.");
    }

    if (!latestScan) {
      items.push("No active RFID scan has been captured recently.");
    }

    return items;
  }, [error, statusData, receivedAtSdyCount, latestScan]);

  const pageTitleMap = {
    overview: "Management Overview",
    live: "Live RFID Monitor",
    inventory: "Roll Inventory",
    shipments: "PK → SDY Shipments",
    exception: "Exception Monitor",
    analytics: "Shipment Analytics",
  };

  const backendOnline = !error && statusData?.status === "ONLINE";

  function renderCompactTable(rows) {
    if (!rows.length) {
      return <EmptyState text="No RFID activity available." />;
    }

    return (
      <div className="table-wrap compact-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>RFID EPC / Serial</th>
              <th>Model</th>
              <th>Lot Number</th>
              <th>Status</th>
              <th>Last Scan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((roll) => {
              const statusText = displayRollStatus(roll);
              return (
                <tr key={`${roll.epc}-${roll.scannedAt || ""}`}>
                  <td>
                    <div className="table-primary">{roll.epc || "—"}</div>
                    <div className="table-secondary">{roll.serial || "—"}</div>
                  </td>
                  <td>{roll.model_code || "—"}</td>
                  <td>{roll.lot_no || "—"}</td>
                  <td>
                    <Badge tone={statusTone(statusText)}>{statusText}</Badge>
                  </td>
                  <td>{formatDateTime(roll.scannedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderOverview() {
    return (
      <>
        <div className="kpi-grid">
          {kpis.map((item) => (
            <KpiCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="Material Movement"
          title="Port Klang → Sendayan"
        >
          <div className="flow-strip">
            <div className="flow-node">
              <div className="flow-code">PK</div>
              <div>
                <div className="flow-name">Port Klang</div>
                <div className="flow-sub">RFID scanning and dispatch</div>
              </div>
            </div>

            <div className="flow-arrow-wrap">
              <div className="flow-arrow-label">Outbound logistics</div>
              <div className="flow-arrow">→</div>
              <div className="flow-arrow-sub">Shipment tracking</div>
            </div>

            <div className="flow-node flow-node-dest">
              <div className="flow-code">SDY</div>
              <div>
                <div className="flow-name">Sendayan</div>
                <div className="flow-sub">Receiving integration pending</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="content-grid two-col-main">
          <SectionCard
            eyebrow="Live Data"
            title="RFID Scanning Activity"
            right={
              <Badge tone={backendOnline ? "green" : "amber"}>
                {backendOnline ? "API Connected" : "API Issue"}
              </Badge>
            }
          >
            <div className="summary-band">
              <div className="summary-band-left">
                <div className="summary-big">{scannedCount}</div>
                <div className="summary-caption">Scanned rolls</div>
              </div>
              <div className="summary-band-right">
                <div className="summary-detail">
                  <span>Latest recorded EPC</span>
                  <strong>{latestScan?.epc || "—"}</strong>
                </div>
                <div className="summary-detail">
                  <span>Last recorded time</span>
                  <strong>{formatDateTime(latestScan?.scannedAt)}</strong>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Movement History" title="Recent Shipment Timeline">
            {shipments.length ? (
              <div className="timeline-list">
                {shipments.slice(0, 4).map((ship) => (
                  <div className="timeline-item" key={ship.lot_no}>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <strong>{ship.lot_no || "—"}</strong>
                      <div>
                        Qty: {ship.qty ?? "—"} • {String(ship.status || "—")}
                      </div>
                      <small>{formatDateTime(ship.departed_at)}</small>
                    </div>
                    <Badge tone="amber">Outbound</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No shipment record available." />
            )}
          </SectionCard>
        </div>

        <SectionCard
          eyebrow="RFID Roll Data"
          title="Current Gate A Batch"
          right={<Badge tone="blue">{recentBatch.length} records</Badge>}
        >
          {renderCompactTable(recentBatch.slice(0, 8))}
        </SectionCard>
      </>
    );
  }

  function renderLiveMonitor() {
    return (
      <>
        <SectionCard
          eyebrow="Station 2 • Port Klang"
          title="Live RFID Control Board"
          right={
            <Badge tone={backendOnline ? "green" : "amber"}>
              {backendOnline ? "API Online" : "Connection Issue"}
            </Badge>
          }
        >
          <div className="live-board-grid">
            {kpis.map((item) => (
              <KpiCard key={`live-${item.label}`} {...item} />
            ))}
          </div>

          <div className="live-meta-row">
            <div className="live-meta-card">
              <span>Latest RFID EPC</span>
              <strong>{latestScan?.epc || "—"}</strong>
            </div>
            <div className="live-meta-card">
              <span>Recorded at</span>
              <strong>{formatDateTime(latestScan?.scannedAt)}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="RFID Roll Data"
          title="Live RFID Scan Batch"
          right={<Badge tone="blue">{recentBatch.length} records</Badge>}
        >
          <div className="table-toolbar">
            <input
              className="search-input"
              type="text"
              placeholder="Search EPC, serial, model or lot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {renderCompactTable(
            recentBatch.filter((roll) => {
              const keyword = search.trim().toLowerCase();
              if (!keyword) return true;
              return [
                roll.epc,
                roll.serial,
                roll.model_code,
                roll.lot_no,
                roll.status,
              ]
                .map((x) => String(x || "").toLowerCase())
                .some((x) => x.includes(keyword));
            })
          )}
        </SectionCard>
      </>
    );
  }

  function renderInventory() {
    return (
      <>
        <div className="kpi-grid">
          {kpis.map((item) => (
            <KpiCard key={`inventory-${item.label}`} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="RFID Roll Records"
          title="Port Klang Roll Inventory"
          right={<Badge tone="blue">{filteredInventory.length} records</Badge>}
        >
          <div className="table-toolbar">
            <input
              className="search-input"
              type="text"
              placeholder="Search EPC, model, serial or lot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredInventory.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>RFID EPC / Serial</th>
                    <th>Model</th>
                    <th>Lot No.</th>
                    <th>Status</th>
                    <th>Ship ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((roll) => {
                    const statusText = displayRollStatus(roll);
                    return (
                      <tr key={roll.epc}>
                        <td>
                          <div className="table-primary">{roll.epc || "—"}</div>
                          <div className="table-secondary">{roll.serial || "—"}</div>
                        </td>
                        <td>{roll.model_code || "—"}</td>
                        <td>{roll.lot_no || "—"}</td>
                        <td>
                          <Badge tone={statusTone(statusText)}>{statusText}</Badge>
                        </td>
                        <td>{roll.ship_id || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No roll records found." />
          )}
        </SectionCard>
      </>
    );
  }

  function renderShipments() {
    return (
      <>
        <div className="kpi-grid">
          <KpiCard
            label="Shipments Out"
            value={shipmentsOutCount}
            subtext="Backend summary"
            accent="amber"
          />
          <KpiCard
            label="SDY Received"
            value={receivedAtSdyCount > 0 ? receivedAtSdyCount : "—"}
            subtext="Receiving integration"
            accent="green"
          />
          <KpiCard
            label="Completion Rate"
            value={receivedAtSdyCount > 0 && shipmentsOutCount > 0
              ? `${Math.round((receivedAtSdyCount / shipmentsOutCount) * 100)}%`
              : "—"}
            subtext="Requires confirmed receipts"
            accent="purple"
          />
          <KpiCard
            label="Transit Visibility"
            value={shipments.length}
            subtext="Tracked shipment records"
            accent="blue"
          />
        </div>

        <SectionCard eyebrow="Logistics Flow" title="Outbound PK → SDY">
          <div className="flow-strip">
            <div className="flow-node">
              <div className="flow-code">PK</div>
              <div>
                <div className="flow-name">Port Klang</div>
                <div className="flow-sub">Origin and dispatch</div>
              </div>
            </div>

            <div className="flow-arrow-wrap">
              <div className="flow-arrow-label">Outbound logistics</div>
              <div className="flow-arrow">→</div>
              <div className="flow-arrow-sub">Shipment tracking</div>
            </div>

            <div className="flow-node flow-node-dest">
              <div className="flow-code">SDY</div>
              <div>
                <div className="flow-name">Sendayan</div>
                <div className="flow-sub">Receiving integration pending</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Shipment Operations"
          title="PK → SDY Shipment Register"
          right={<Badge tone="blue">{shipments.length} records</Badge>}
        >
          {shipments.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Shipment ID</th>
                    <th>Qty</th>
                    <th>Dispatched at PK</th>
                    <th>Received at SDY</th>
                    <th>Transit Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((ship) => (
                    <tr key={ship.lot_no}>
                      <td>{ship.lot_no || "—"}</td>
                      <td>{ship.qty ?? "—"}</td>
                      <td>{formatDateTime(ship.departed_at)}</td>
                      <td>Not connected</td>
                      <td>—</td>
                      <td>
                        <Badge tone={ship.status === "OUT" ? "amber" : "slate"}>
                          {String(ship.status || "—").toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No shipment records available." />
          )}
        </SectionCard>
      </>
    );
  }

  function renderException() {
    return (
      <>
        <SectionCard
          eyebrow="Monitoring Notices"
          title="Alerts & Follow-up"
          right={<Badge tone="amber">Monitoring status</Badge>}
        >
          {exceptions.length ? (
            <div className="exception-list">
              {exceptions.map((item, idx) => (
                <div className="exception-item" key={idx}>
                  <div className="exception-icon">i</div>
                  <div className="exception-content">
                    <strong>{item}</strong>
                    <small>Review system status and integration progress.</small>
                  </div>
                  <Badge tone="slate">Pending</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No exception found." />
          )}
        </SectionCard>
      </>
    );
  }

  function renderAnalytics() {
    const totalInventory = allRolls.length || 1;
    return (
      <>
        <div className="kpi-grid">
          {kpis.map((item) => (
            <KpiCard key={`analytics-${item.label}`} {...item} />
          ))}
        </div>

        <div className="content-grid two-col-main">
          <SectionCard eyebrow="RFID Analytics" title="Inventory by Model">
            {inventoryByModel.length ? (
              <div className="bar-list">
                {inventoryByModel.map((item) => {
                  const width = Math.max(
                    10,
                    Math.round((item.count / totalInventory) * 100)
                  );
                  return (
                    <div className="bar-row" key={item.model}>
                      <div className="bar-label">{item.model}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${width}%` }} />
                      </div>
                      <div className="bar-value">{item.count}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="No model analytics available." />
            )}
          </SectionCard>

          <SectionCard eyebrow="Transit Performance" title="Shipment Analytics">
            <div className="analytics-metrics">
              <div className="analytics-metric">
                <span>Confirmed completed shipments</span>
                <strong>{receivedAtSdyCount}</strong>
              </div>
              <div className="analytics-metric">
                <span>Outbound shipments</span>
                <strong>{shipmentsOutCount}</strong>
              </div>
              <div className="analytics-metric">
                <span>Average transit duration</span>
                <strong>—</strong>
              </div>
              <div className="analytics-note">
                SDY confirmation is not connected yet, so transit duration and
                completion analytics are still limited.
              </div>
            </div>
          </SectionCard>
        </div>
      </>
    );
  }

  function renderDetailedContent() {
    switch (view) {
      case "live":
        return renderLiveMonitor();
      case "inventory":
        return renderInventory();
      case "shipments":
        return renderShipments();
      case "exception":
        return renderException();
      case "analytics":
        return renderAnalytics();
      case "overview":
      default:
        return renderOverview();
    }
  }

  function renderFactoryMode() {
    return (
      <div className="factory-tv-shell">
        <header className="factory-tv-header">
          <div>
            <div className="page-kicker">SUGIHARA RFID CONTROL CENTER</div>
            <h1>Factory TV View</h1>
            <div className="page-subtitle">
              Station 2 • Port Klang • Gate A • RFID Monitoring
            </div>
          </div>

          <div className="factory-tv-header-right">
            <Badge tone={backendOnline ? "green" : "amber"}>
              {backendOnline ? "Backend Online" : "Backend Issue"}
            </Badge>
            <div className="tv-clock">
              <strong>{now.toLocaleTimeString("en-GB")}</strong>
              <span>
                {now.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <button
              className="tv-mode-btn"
              onClick={() => setFactoryMode(false)}
            >
              Exit TV Mode
            </button>
          </div>
        </header>

        <div className="factory-tv-kpis">
          {kpis.map((item) => (
            <KpiCard key={`tv-${item.label}`} {...item} />
          ))}
        </div>

        <div className="factory-tv-panels">
          <SectionCard
            eyebrow="Monitoring Panel"
            title="Live RFID Monitor"
            right={<Badge tone="green">Live View</Badge>}
            className="tv-panel"
          >
            <div className="tv-live-panel">
              <div className="tv-live-main">
                <div className="tv-live-count">{scannedCount}</div>
                <div className="tv-live-label">rolls in current batch</div>
              </div>

              <div className="tv-live-info">
                <div className="tv-info-item">
                  <span>Latest scanned EPC</span>
                  <strong>{latestScan?.epc || "—"}</strong>
                </div>
                <div className="tv-info-item">
                  <span>Model</span>
                  <strong>{latestScan?.model_code || "—"}</strong>
                </div>
                <div className="tv-info-item">
                  <span>Status</span>
                  <strong>{latestScan ? displayRollStatus(latestScan) : "—"}</strong>
                </div>
                <div className="tv-info-item">
                  <span>Recorded at</span>
                  <strong>{formatDateTime(latestScan?.scannedAt)}</strong>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Tracking Panel"
            title="PK → SDY Tracking"
            right={<Badge tone="amber">Phase 2</Badge>}
            className="tv-panel"
          >
            <div className="tv-flow-card">
              <div className="tv-flow-node">
                <div className="tv-flow-code">PK</div>
                <div>
                  <div className="tv-flow-name">Port Klang</div>
                  <div className="tv-flow-sub">Scan • Validate • Dispatch</div>
                </div>
              </div>

              <div className="tv-flow-center">
                <div className="tv-flow-arrow">→</div>
                <div className="tv-flow-center-text">Outbound Shipment</div>
              </div>

              <div className="tv-flow-node dest">
                <div className="tv-flow-code">SDY</div>
                <div>
                  <div className="tv-flow-name">Sendayan</div>
                  <div className="tv-flow-sub">Receiving integration pending</div>
                </div>
              </div>
            </div>

            <div className="tv-tracking-status">
              <div className="tv-status-box">
                <span>Shipments out</span>
                <strong>{shipmentsOutCount}</strong>
              </div>
              <div className="tv-status-box">
                <span>Received at SDY</span>
                <strong>{receivedAtSdyCount > 0 ? receivedAtSdyCount : "—"}</strong>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          eyebrow="Recent Activity"
          title="Current RFID Activity"
          right={<Badge tone="blue">{recentFactoryRows.length} latest scans</Badge>}
          className="factory-tv-table-card"
        >
          {renderCompactTable(recentFactoryRows)}
        </SectionCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-card">
          <div className="loading-title">Loading RFID dashboard…</div>
          <div className="loading-subtitle">Connecting to Node.js backend</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${factoryMode ? "factory-mode" : ""}`}>
      {!factoryMode && (
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-logo">SG</div>
            <div className="brand-text">
              <strong>SUGIHARA</strong>
              <span>Digital Operations</span>
            </div>
          </div>

          <div className="sidebar-group-title">RFID Logistics Control</div>

          <nav className="nav-list">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${view === item.key ? "active" : ""}`}
                onClick={() => setView(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-location-card">
              <div className="sidebar-location-title">Active Location</div>
              <strong>PORT KLANG</strong>
              <span>Station 2 • Gate A</span>
            </div>

            <div className="sidebar-location-card secondary">
              <div className="sidebar-location-title">Destination</div>
              <strong>SENDAYAN</strong>
              <span>Station 3 • Receiving</span>
            </div>
          </div>
        </aside>
      )}

      <main className="main-area">
        {!factoryMode ? (
          <>
            <header className="top-header">
              <div className="top-header-left">
                <div className="page-kicker">MANUFACTURING LOGISTICS</div>
                <h1>{pageTitleMap[view]}</h1>
                <div className="page-subtitle">
                  Port Klang to Sendayan • RFID Tracking & Logistics
                </div>
              </div>

              <div className="top-header-right">
                <div className="header-clock">
                  <strong>{now.toLocaleTimeString("en-GB")}</strong>
                  <span>
                    {now.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <Badge tone={backendOnline ? "green" : "amber"}>
                  {backendOnline ? "Backend Online" : "Connection Issue"}
                </Badge>

                <button
                  className="tv-mode-btn"
                  onClick={() => setFactoryMode(true)}
                >
                  Factory TV Mode
                </button>
              </div>
            </header>

            <div className="info-strip">
              <span>Development environment</span>
              <span>Live Node.js API</span>
              <span>Dispatch disabled in this dashboard</span>
              <span>{REFRESH_MS / 1000}-second refresh</span>
            </div>

            {error ? (
              <div className="error-banner">
                Backend/API issue: {error}
              </div>
            ) : null}

            <div className="page-content">{renderDetailedContent()}</div>
          </>
        ) : (
          renderFactoryMode()
        )}
      </main>
    </div>
  );
}

export default App;