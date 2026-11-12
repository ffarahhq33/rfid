import React from "react";
import {
  Package,
  Truck,
  ArrowUpRight,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Card, KPI, Count } from "../components/UI";

const STAGES = ["PK Storage", "In Transit", "SDY Storage", "Production", "Completed"];

export default function Dashboard({ rolls, navigate, events }) {
  const count = (status) => rolls.filter((r) => r.status === status).length,
    pk = rolls.filter((r) => r.location.startsWith("PK")).length,
    transit = count("In Transit"),
    sdy = count("Received"),
    released = count("Released"),
    eligible = rolls.filter((r) =>
      ["Completed", "Released"].includes(r.status),
    ).length,
    stages = [pk, transit, sdy, count("Issued"), eligible];
  return (
    <>
      <div className="overview-banner">
        <div>
          <h2>
            Every roll. Every movement.
            <br />
            <span>One complete picture.</span>
          </h2>
          <p>Material visibility across Port Klang and Sendayan.</p>
          <button className="secondary" onClick={() => navigate(7)}>
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
      <div className="kpi-grid">
        <KPI label="PK available rolls" value={pk} />
        <KPI label="In transit" value={transit} />
        <KPI label="SDY available rolls" value={sdy} />
        <KPI
          label="RFID reset rate"
          value={eligible ? Math.round((released / eligible) * 100) + "%" : "—"}
          note={`${released} of ${eligible} eligible tags released`}
        />
      </div>
      <div className="dashboard-grid">
        <Card
          title="Roll movement"
          action={<span className="subtle">{rolls.length} rolls</span>}
        >
          <div className="flow-stages">
            {STAGES.map((label, i) => (
              <div key={label}>
                <strong>
                  <Count value={stages[i]} />
                </strong>
                <small>
                  <span className={"stage-dot stage-" + i} />
                  {label}
                </small>
              </div>
            ))}
          </div>
          <div className="segmented-bar" aria-hidden>
            {stages.map((n, i) => (
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
        <Card title="Needs attention">
          <button className="alert-row" onClick={() => navigate(4)}>
            <span className="alert-icon">
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
      <Card
        title="Recent activity"
        action={
          <button className="text-button" onClick={() => navigate(7)}>
            View all <ArrowUpRight size={15} />
          </button>
        }
      >
        <div className="activities">
          {events.slice(0, 5).map((e, i) => (
            <div className="activity" key={e.k ?? i}>
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
    </>
  );
}
