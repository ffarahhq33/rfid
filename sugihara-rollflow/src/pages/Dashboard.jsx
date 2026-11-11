import React from "react";
import {
  Package,
  Truck,
  RotateCcw,
  ArrowUpRight,
  ArrowRight,
  Check,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Card, KPI, Badge } from "../components/UI";
export default function Dashboard({ rolls, navigate, events }) {
  const pk = rolls.filter((r) => r.location.startsWith("PK")).length,
    transit = rolls.filter((r) => r.status === "In Transit").length,
    sdy = rolls.filter((r) => r.status === "Received").length,
    released = rolls.filter((r) => r.status === "Released").length,
    eligible = rolls.filter((r) =>
      ["Completed", "Released"].includes(r.status),
    ).length;
  return (
    <>
      <div className="overview-banner">
        <div>
          <span className="eyebrow">CONNECTED OPERATIONS</span>
          <h2>
            Every roll. Every movement.
            <br />
            <span>One complete picture.</span>
          </h2>
          <p>Material visibility across Port Klang and Sendayan.</p>
          <button onClick={() => navigate(7)}>
            Explore movement history <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="route-visual">
          <div className="route-end">
            <div className="factory-icon">
              <Package size={28} />
            </div>
            <strong>Port Klang</strong>
            <small>Registration & dispatch</small>
          </div>
          <div className="route-line">
            <span>PK → SDY</span>
            <div>
              <i />
              <Truck size={24} />
              <i />
            </div>
            <small>{transit} rolls in transit</small>
          </div>
          <div className="route-end">
            <div className="factory-icon">
              <Package size={28} />
            </div>
            <strong>Sendayan</strong>
            <small>Receiving & production</small>
          </div>
        </div>
      </div>
      <div className="section-label">
        <h2>At a glance</h2>
        <span>
          <i className="dot" /> Mock operational snapshot
        </span>
      </div>
      <div className="kpi-grid">
        <KPI
          label="PK available rolls"
          value={pk}
          note="Current available stock"
          icon={Package}
        />
        <KPI
          label="In transit"
          value={transit}
          note="Awaiting SDY receipt"
          icon={Truck}
        />
        <KPI
          label="SDY available rolls"
          value={sdy}
          note="Ready for production"
          icon={Package}
        />
        <KPI
          label="RFID reset rate"
          value={eligible ? Math.round((released / eligible) * 100) + "%" : "—"}
          note={`${released} of ${eligible} eligible tags released`}
          icon={RotateCcw}
        />
      </div>
      <div className="dashboard-grid">
        <Card
          title="Roll movement overview"
          subtitle="Current distribution across the roll lifecycle"
          action={<span className="subtle">{rolls.length} demo rolls</span>}
        >
          <div className="flow-stages">
            {[
              ["PK Storage", pk],
              ["In Transit", transit],
              ["SDY Storage", sdy],
              ["Production", rolls.filter((r) => r.status === "Issued").length],
              ["Completed", eligible],
            ].map(([s, n], i) => (
              <div key={s}>
                <span className={"stage-icon stage-" + i}>
                  {i === 4 ? <Check size={19} /> : <Package size={19} />}
                </span>
                <strong>{n}</strong>
                <small>{s}</small>
              </div>
            ))}
          </div>
          <div className="segmented-bar">
            {[
              pk,
              transit,
              sdy,
              rolls.filter((r) => r.status === "Issued").length,
              eligible,
            ].map((n, i) => (
              <div
                key={i}
                style={{ flex: n }}
                className={"segment segment-" + i}
              />
            ))}
          </div>
          <div className="panel-foot">
            <span>Permanent identity. Complete traceability.</span>
            <button className="text-button" onClick={() => navigate(7)}>
              View history <ArrowRight size={14} />
            </button>
          </div>
        </Card>
        <Card
          title="Needs attention"
          subtitle="Keep the next step moving"
          action={<span className="count-pill">2</span>}
        >
          <button className="alert-row" onClick={() => navigate(4)}>
            <span className="alert-icon amber">
              <Truck size={19} />
            </span>
            <div>
              <strong>Shipment awaiting receipt</strong>
              <p>DSP-PK-0008 · {transit} rolls expected</p>
            </div>
            <ArrowUpRight size={17} />
          </button>
          <button className="alert-row" onClick={() => navigate(5)}>
            <span className="alert-icon purple">
              <AlertTriangle size={19} />
            </span>
            <div>
              <strong>Review model stock levels</strong>
              <p>Check SDY replenishment thresholds</p>
            </div>
            <ArrowUpRight size={17} />
          </button>
        </Card>
      </div>
      <div className="dashboard-grid bottom-grid">
        <Card
          title="Recent activity"
          subtitle="Latest transactions across your stations"
          action={
            <button className="text-button" onClick={() => navigate(7)}>
              View all <ArrowUpRight size={15} />
            </button>
          }
        >
          <div className="activities">
            {events.slice(0, 4).map((e, i) => (
              <div className="activity" key={i}>
                <div className="activity-dot">
                  <Activity size={16} />
                </div>
                <div>
                  <strong>{e.action}</strong>
                  <p className="mono">{e.id}</p>
                </div>
                <div className="activity-time">
                  <span>{e.time}</span>
                  <small>{e.site}</small>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card
          title="Station shortcuts"
          subtitle="Your daily operations, one click away"
        >
          <div className="shortcuts">
            {[
              [1, "Register a roll", "Create a new roll identity"],
              [3, "Prepare dispatch", "Move material to Sendayan"],
              [4, "Receive shipment", "Verify incoming material"],
            ].map(([n, t, d]) => (
              <button key={n} onClick={() => navigate(n)}>
                <span className="shortcut-number">0{n}</span>
                <span>
                  <strong>{t}</strong>
                  <small>{d}</small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
