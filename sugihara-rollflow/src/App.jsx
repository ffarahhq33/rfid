import React, { useEffect, useRef, useState } from "react";
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
  ChevronRight,
  Menu,
  X,
  Radio,
  Check,
  AlertTriangle,
} from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Stations from "./pages/Stations";
import { Dialog, Badge, reducedMotion } from "./components/UI";
import { initialRolls, pageInfo } from "./data/mock";
import { loadRolls } from "./data/api";
import { PageSkeleton } from "./components/Skeleton";
import "./design/tokens.css";
import "./styles.css";
import "./motion.css";
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
const stamp = () =>
  new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
  });
const groups = ["", "Port Klang", "Port Klang", "Port Klang", "Sendayan", "Sendayan", "Sendayan", "Management", "Management"];
let eventKey = 0;
export default function App() {
  const [page, setPage] = useState(
      Math.max(
        0,
        Math.min(8, Number.parseInt(location.hash.slice(1), 10) || 0),
      ),
    ),
    [rolls, setRolls] = useState(null),
    [loadFailed, setLoadFailed] = useState(false),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(null),
    [pulse, setPulse] = useState(() => new Set()),
    [detail, setDetail] = useState(null),
    [dialog, setDialog] = useState(null),
    [threshold, setThreshold] = useState(2),
    [scrolled, setScrolled] = useState(false),
    [events, setEvents] = useState([
      {
        action: "Roll registered",
        k: "seed-14:32",
        id: initialRolls[0].id,
        time: "14:32",
        site: "PK",
      },
      {
        action: "Shipment dispatched",
        k: "seed-13:45",
        id: "DSP-PK-0008",
        time: "13:45",
        site: "PK",
      },
      {
        action: "Roll received at SDY",
        k: "seed-12:15",
        id: initialRolls[13].id,
        time: "12:15",
        site: "SDY",
      },
      {
        action: "Consumption completed",
        k: "seed-11:48",
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
  useEffect(() => {
    if (rolls || loadFailed) return;
    let live = true;
    loadRolls().then(
      (data) => live && setRolls(data),
      () => live && setLoadFailed(true),
    );
    return () => {
      live = false;
    };
  }, [rolls, loadFailed]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const rollsRef = useRef(rolls),
    eventsRef = useRef(events),
    toastTimer = useRef(),
    pulseTimer = useRef();
  rollsRef.current = rolls;
  eventsRef.current = events;
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(pulseTimer.current);
    },
    [],
  );
  const dismiss = () => {
    clearTimeout(toastTimer.current);
    if (reducedMotion()) return setToast(null);
    setToast((t) => t && { ...t, leaving: true });
    toastTimer.current = setTimeout(() => setToast(null), 200);
  };
  const notify = (text, type = "info") => {
    clearTimeout(toastTimer.current);
    setToast({ text, type, n: ++eventKey });
    toastTimer.current = setTimeout(dismiss, 6000);
  };
  // Highlights the given rolls with a short success pulse.
  const flash = (ids) => {
    clearTimeout(pulseTimer.current);
    setPulse(new Set(ids));
    pulseTimer.current = setTimeout(() => setPulse(new Set()), 1800);
  };
  // Optimistic update: the change is shown at once, then persisted. A failed
  // save restores the previous records and tells the operator.
  const commit = async ({ apply, entries = [], persist, success, ids = [] }) => {
    const before = { rolls: rollsRef.current, events: eventsRef.current };
    const time = stamp();
    setRolls(apply);
    setEvents((prev) => [
      ...[...entries].reverse().map((e) => ({ ...e, time, k: ++eventKey })),
      ...prev,
    ]);
    flash(ids);
    notify(success, "success");
    try {
      await persist?.();
      return true;
    } catch {
      setRolls(before.rolls);
      setEvents(before.events);
      setPulse(new Set());
      notify("Could not save. The change was reverted.", "error");
      return false;
    }
  };
  const confirm = (title, text, action) => setDialog({ title, text, action });
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a className="brand" href="#0" onClick={() => navigate(0)}>
          <img
            className="brand-logo"
            src="/sugihara-logo.png"
            alt=""
            width="44"
            height="44"
          />
          <b>
            SUGIHARA<span>RollFlow</span>
          </b>
        </a>
        <nav aria-label="Main navigation">
          {pageInfo.map(([name], i) => {
            const Icon = icons[i];
            return (
              <React.Fragment key={name}>
                {[1, 4, 7].includes(i) && (
                  <div className="nav-label">{groups[i]}</div>
                )}
                <button
                  className={"nav-item " + (page === i ? "selected" : "")}
                  onClick={() => navigate(i)}
                >
                  <Icon size={18} />
                  <span>{name}</span>
                  {i >= 1 && i <= 6 && (
                    <small className="nav-number">{i - 1}</small>
                  )}
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
        <header className={"topbar" + (scrolled ? " scrolled" : "")}>
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            {groups[page] && (
              <>
                {groups[page]} <ChevronRight size={14} />
              </>
            )}
            <strong>{pageInfo[page]?.[0]}</strong>
          </div>
        </header>
        <main>
          <div className="page-view" key={page}>
          <div className="page-heading">
            <div>
              <h1>{pageInfo[page]?.[1]}</h1>
              <p>{pageInfo[page]?.[2]}</p>
            </div>
            {page === 0 && (
              <button onClick={() => navigate(1)}>
                <ScanLine size={17} /> Register roll
              </button>
            )}
          </div>
          {loadFailed ? (
            <div className="card load-error" role="alert">
              <p>Could not load the roll records.</p>
              <button
                className="secondary"
                onClick={() => {
                  setLoadFailed(false);
                }}
              >
                Try again
              </button>
            </div>
          ) : !rolls ? (
            <PageSkeleton page={page} />
          ) : page === 0 ? (
            <Dashboard rolls={rolls} events={events} navigate={navigate} />
          ) : (
            <Stations
              key={page}
              page={page}
              rolls={rolls}
              commit={commit}
              pulse={pulse}
              notify={notify}
              select={setDetail}
              threshold={threshold}
              setThreshold={setThreshold}
              events={events}
              confirm={confirm}
            />
          )}
          </div>
        </main>
      </div>
      {toast && (
        <div
          role="status"
          key={toast.n}
          className={`toast ${toast.type}${toast.leaving ? " leaving" : ""}`}
        >
          {toast.type === "success" && (
            <span className="toast-icon">
              <Check size={14} strokeWidth={3} />
            </span>
          )}
          {toast.type === "error" && (
            <span className="toast-icon">
              <AlertTriangle size={14} />
            </span>
          )}
          <span>{toast.text}</span>
          <button aria-label="Dismiss notification" onClick={dismiss}>
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
              <p key={e.k ?? i}>
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
          {(close) => (
            <>
              <p>{dialog.text}</p>
              <div className="dialog-actions">
                <button className="secondary" onClick={close}>
                  Cancel
                </button>
                <button
                  onClick={() => {
                    dialog.action();
                    close();
                  }}
                >
                  Confirm demo action
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}

