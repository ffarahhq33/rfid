import React, { useState } from "react";
import {
  LayoutDashboard,
  ScanLine,
  Package,
  Truck,
  PackageCheck,
  Boxes,
  RotateCcw,
  ChartNoAxesCombined,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Bell,
  ArrowUpRight,
  Radio,
  HelpCircle,
} from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Stations from "./pages/Stations";
import { Dialog, Badge } from "./components/UI";
import { initialRolls, pageInfo } from "./data/mock";
import "./styles.css";
const icons = [
  LayoutDashboard,
  ScanLine,
  Package,
  Truck,
  PackageCheck,
  Boxes,
  RotateCcw,
  ChartNoAxesCombined,
  Settings,
];
export default function App() {
  const [page, setPage] = useState(
      Math.max(
        0,
        Math.min(8, Number.parseInt(location.hash.slice(1), 10) || 0),
      ),
    ),
    [rolls, setRolls] = useState(initialRolls),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(""),
    [detail, setDetail] = useState(null),
    [dialog, setDialog] = useState(null),
    [threshold, setThreshold] = useState(2),
    [events, setEvents] = useState([
      {
        action: "Roll registered",
        id: initialRolls[0].id,
        time: "14:32",
        site: "PK",
      },
      {
        action: "Shipment dispatched",
        id: "DSP-PK-0008",
        time: "13:45",
        site: "PK",
      },
      {
        action: "Roll received at SDY",
        id: initialRolls[13].id,
        time: "12:15",
        site: "SDY",
      },
      {
        action: "Consumption completed",
        id: initialRolls[17].id,
        time: "11:48",
        site: "SDY",
      },
    ]);
  const navigate = (n) => {
    setPage(n);
    location.hash = n;
    setMenu(false);
    window.scrollTo(0, 0);
  };
  const notify = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 6000);
  };
  const record = (action, id, site) =>
    setEvents((prev) => [
      {
        action,
        id,
        site,
        time: new Date().toLocaleTimeString("en-GB", {
          timeZone: "Asia/Kuala_Lumpur",
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...prev,
    ]);
  const confirm = (title, text, action) => setDialog({ title, text, action });
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a className="brand" href="#0" onClick={() => navigate(0)}>
          <div className="brand-mark">
            <Boxes size={25} />
          </div>
          <div>
            <b>
              SUGIHARA<span>RollFlow</span>
            </b>
            <small>MATERIAL IN MOTION</small>
          </div>
        </a>
        <div className="workspace">
          <span className="workspace-icon">S</span>
          <div>
            <strong>Factory Operations</strong>
            <small>Port Klang & Sendayan</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav aria-label="Main navigation">
          {pageInfo.map(([name], i) => {
            const Icon = icons[i];
            return (
              <React.Fragment key={name}>
                {[0, 1, 4, 7].includes(i) && (
                  <div className="nav-label">
                    {i === 0
                      ? "WORKSPACE"
                      : i === 1
                        ? "PORT KLANG"
                        : i === 4
                          ? "SENDAYAN"
                          : "MANAGEMENT"}
                  </div>
                )}
                <button
                  className={"nav-item " + (page === i ? "selected" : "")}
                  onClick={() => navigate(i)}
                >
                  <Icon size={18} />
                  <span>{name}</span>
                  {i > 0 && i < 7 && <small>0{i}</small>}
                  {page === i && <ChevronRight size={14} />}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-panel">
            <Radio size={17} />
            <div>
              <strong>Frontend preview</strong>
              <small>Mock data · readers offline</small>
            </div>
          </div>
          <div className="profile">
            <span className="avatar">DO</span>
            <div>
              <strong>Demo Operator</strong>
              <small>Preview workspace</small>
            </div>
          </div>
        </div>
      </aside>
      {menu && <div className="nav-scrim" onClick={() => setMenu(false)} />}
      <div className="main">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />{" "}
            <strong>{pageInfo[page]?.[0]}</strong>
          </div>
          <div className="top-actions">
            <span className="demo-tag">DEMO ENVIRONMENT</span>
            <button
              className="icon-button"
              aria-label="View operational alerts"
              onClick={() => navigate(0)}
            >
              <Bell size={19} />
              <i className="notification-dot" />
            </button>
            <span className="avatar small-avatar">DO</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {page === 0
                  ? "YOUR OPERATIONS, CONNECTED"
                  : page < 4
                    ? "PORT KLANG OPERATIONS"
                    : page < 7
                      ? "SENDAYAN OPERATIONS"
                      : "WORKSPACE MANAGEMENT"}
              </span>
              <h1>{pageInfo[page]?.[1]}</h1>
              <p>{pageInfo[page]?.[2]}</p>
            </div>
            {page === 0 ? (
              <button onClick={() => navigate(1)}>
                <ScanLine size={17} /> Register roll
              </button>
            ) : (
              <span className="date-chip">10 Nov 2026 · Demo snapshot</span>
            )}
          </div>
          {page === 0 ? (
            <Dashboard rolls={rolls} events={events} navigate={navigate} />
          ) : (
            <Stations
              key={page}
              page={page}
              rolls={rolls}
              setRolls={setRolls}
              record={record}
              notify={notify}
              select={setDetail}
              threshold={threshold}
              setThreshold={setThreshold}
              events={events}
              confirm={confirm}
            />
          )}
          <footer>
            <span>
              SUGIHARA <b>RollFlow</b> <span className="footer-divider">/</span>{" "}
              RFID Roll Traceability
            </span>
            <span>Illustrative records · Session-only changes</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {detail && (
        <Dialog title="Roll details" onClose={() => setDetail(null)}>
          <Badge>{detail.status}</Badge>
          <h3 className="mono">{detail.id}</h3>
          <dl>
            {Object.entries(detail).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v || "Released"}</dd>
              </div>
            ))}
          </dl>
          <h3>Recorded events</h3>
          {events
            .filter((e) => e.id === detail.id)
            .map((e, i) => (
              <p key={i}>
                {e.time} · {e.action}
              </p>
            ))}
          <p className="hint">
            Permanent roll identity is retained when its tag is released.
          </p>
        </Dialog>
      )}
      {dialog && (
        <Dialog title={dialog.title} onClose={() => setDialog(null)}>
          <p>{dialog.text}</p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              onClick={() => {
                dialog.action();
                setDialog(null);
              }}
            >
              Confirm demo action
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

