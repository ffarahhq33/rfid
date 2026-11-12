import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Maximize2,
  Minimize2,
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

const groups = [
  "",
  "Port Klang",
  "Port Klang",
  "Port Klang",
  "Sendayan",
  "Sendayan",
  "Sendayan",
  "Management",
  "Management",
];

const stamp = () =>
  new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
  });

let eventKey = 0;

export default function App() {
  const [page, setPage] = useState(
    Math.max(
      0,
      Math.min(8, Number.parseInt(location.hash.slice(1), 10) || 0),
    ),
  );

  const [rolls, setRolls] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [pulse, setPulse] = useState(() => new Set());
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [threshold, setThreshold] = useState(2);
  const [scrolled, setScrolled] = useState(false);

  // NEW: rolls called for loading on the dispatch queue.
  const [queueSelected, setQueueSelected] = useState([]);

  const [events, setEvents] = useState([
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

  const rollsRef = useRef(rolls);
  const eventsRef = useRef(events);
  const toastTimer = useRef();
  const pulseTimer = useRef();

  rollsRef.current = rolls;
  eventsRef.current = events;

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

  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(pulseTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (page !== 3) {
      setQueueSelected([]);
    }
  }, [page]);

  const dismiss = () => {
    clearTimeout(toastTimer.current);

    if (reducedMotion()) {
      return setToast(null);
    }

    setToast((current) => current && { ...current, leaving: true });

    toastTimer.current = setTimeout(() => setToast(null), 200);
  };

  const notify = (text, type = "info") => {
    clearTimeout(toastTimer.current);

    setToast({
      text,
      type,
      n: ++eventKey,
    });

    toastTimer.current = setTimeout(dismiss, 6000);
  };

  const flash = (ids) => {
    clearTimeout(pulseTimer.current);
    setPulse(new Set(ids));

    pulseTimer.current = setTimeout(
      () => setPulse(new Set()),
      1800,
    );
  };

  const commit = async ({
    apply,
    entries = [],
    persist,
    success,
    ids = [],
  }) => {
    const before = {
      rolls: rollsRef.current,
      events: eventsRef.current,
    };

    const time = stamp();

    setRolls(apply);

    setEvents((previous) => [
      ...[...entries].reverse().map((entry) => ({
        ...entry,
        time,
        k: ++eventKey,
      })),
      ...previous,
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

  const confirm = (title, text, action) =>
    setDialog({ title, text, action });

  // NEW: call an available PK roll for loading.
  const callQueueRoll = (id) => {
    const roll = rolls?.find((item) => item.id === id);

    if (
      !roll ||
      roll.status !== "Available" ||
      !roll.location.startsWith("PK")
    ) {
      return;
    }

    setQueueSelected((previous) =>
      previous.includes(id)
        ? previous
        : [...previous, id],
    );

    notify(`Roll ${id} called for loading`);
  };

  // NEW: return a called roll to the waiting column.
  const removeQueueRoll = (id) => {
    setQueueSelected((previous) =>
      previous.filter((item) => item !== id),
    );
  };

  // NEW: confirm dispatch using frontend state only.
  const confirmQueueDispatch = () => {
    const ids = (rollsRef.current ?? [])
      .filter(
        (roll) =>
          queueSelected.includes(roll.id) &&
          roll.status === "Available" &&
          roll.location.startsWith("PK"),
      )
      .map((roll) => roll.id);

    if (!ids.length) {
      notify("Call a waiting roll for loading first.");
      return;
    }

    confirm(
      "Confirm dispatch",
      `${ids.length} roll(s) will move to In Transit. Demo data only.`,
      async () => {
        const saved = await commit({
          apply: (previous) =>
            previous.map((roll) =>
              ids.includes(roll.id)
                ? {
                    ...roll,
                    status: "In Transit",
                    location: "In transit",
                  }
                : roll,
            ),
          entries: ids.map((id) => ({
            action: "Roll dispatched",
            id,
            site: "PK",
          })),
          ids,
          success: `${ids.length} roll(s) dispatched`,

          // No persist callback: queue changes are frontend-only.
        });

        if (saved) {
          setQueueSelected([]);
        }
      },
    );
  };

  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#0"
          onClick={() => navigate(0)}
        >
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
                  <div className="nav-label">
                    {groups[i]}
                  </div>
                )}

                <button
                  className={
                    "nav-item " + (page === i ? "selected" : "")
                  }
                  onClick={() => navigate(i)}
                >
                  <Icon size={18} />
                  <span>{name}</span>

                  {i >= 1 && i <= 6 && (
                    <small className="nav-number">
                      {i - 1}
                    </small>
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

      {menu && (
        <div
          className="nav-scrim"
          onClick={() => setMenu(false)}
        />
      )}

      <div className="main">
        <header
          className={"topbar" + (scrolled ? " scrolled" : "")}
        >
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
                {groups[page]}
                <ChevronRight size={14} />
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
                  <ScanLine size={17} />
                  Register roll
                </button>
              )}
            </div>

            {loadFailed ? (
              <div
                className="card load-error"
                role="alert"
              >
                <p>Could not load the roll records.</p>

                <button
                  className="secondary"
                  onClick={() => setLoadFailed(false)}
                >
                  Try again
                </button>
              </div>
            ) : !rolls ? (
              <PageSkeleton page={page} />
            ) : page === 0 ? (
              <Dashboard
                rolls={rolls}
                events={events}
                navigate={navigate}
              />
            ) : (
              <>
                {/* NEW: queue board appears on PK Dispatch only. */}
                {page === 3 && (
                  <DispatchQueue
                    rolls={rolls}
                    selectedIds={queueSelected}
                    onCall={callQueueRoll}
                    onRemove={removeQueueRoll}
                    onConfirm={confirmQueueDispatch}
                  />
                )}

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
              </>
            )}
          </div>
        </main>
      </div>

      {toast && (
        <div
          role="status"
          key={toast.n}
          className={`toast ${toast.type}${
            toast.leaving ? " leaving" : ""
          }`}
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

          <button
            aria-label="Dismiss notification"
            onClick={dismiss}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {detail && (
        <Dialog
          title="Roll details"
          onClose={() => setDetail(null)}
        >
          <Badge>{detail.status}</Badge>
          <h3 className="mono">{detail.id}</h3>

          <dl>
            {Object.entries(detail).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value || "Released"}</dd>
              </div>
            ))}
          </dl>

          <h3>Recorded events</h3>

          {events
            .filter((event) => event.id === detail.id)
            .map((event, i) => (
              <p key={event.k ?? i}>
                {event.time} · {event.action}
              </p>
            ))}

          <p className="hint">
            Permanent roll identity is retained when its tag is released.
          </p>
        </Dialog>
      )}

      {dialog && (
        <Dialog
          title={dialog.title}
          onClose={() => setDialog(null)}
        >
          {(close) => (
            <>
              <p>{dialog.text}</p>

              <div className="dialog-actions">
                <button
                  className="secondary"
                  onClick={close}
                >
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

/*
 * Queue component.
 * It stays in App.jsx and does not have another default export.
 */
function DispatchQueue({
  rolls,
  selectedIds,
  onCall,
  onRemove,
  onConfirm,
}) {
  const [displayMode, setDisplayMode] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const displayButton = useRef(null);

  const selected = new Set(selectedIds);

  const available = rolls.filter(
    (roll) =>
      roll.status === "Available" &&
      roll.location.startsWith("PK"),
  );

  const queue = {
    waiting: available.filter(
      (roll) => !selected.has(roll.id),
    ),
    loading: available.filter(
      (roll) => selected.has(roll.id),
    ),
    dispatched: rolls.filter(
      (roll) => roll.status === "In Transit",
    ),
  };

  useEffect(() => {
    const timer = setInterval(
      () => setNow(new Date()),
      1000,
    );

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!displayMode) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event) => {
      if (event.key === "Escape") {
        setDisplayMode(false);
      }

      if (event.key === "Tab") {
        event.preventDefault();
        displayButton.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    displayButton.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      displayButton.current?.focus();
    };
  }, [displayMode]);

  const columns = [
    {
      key: "waiting",
      title: "Waiting",
      note: "Available at Port Klang",
      icon: Clock3,
    },
    {
      key: "loading",
      title: "Now loading",
      note: "Called for dispatch",
      icon: Package,
    },
    {
      key: "dispatched",
      title: "Dispatched",
      note: "In transit to Sendayan",
      icon: Truck,
    },
  ];

  return (
    <section
      className={`dispatch-queue ${
        displayMode ? "queue-display-mode" : ""
      }`}
      role={displayMode ? "dialog" : "region"}
      aria-modal={displayMode || undefined}
      aria-label="PK dispatch queue"
    >
      <header className="queue-heading">
        <div>
          <span className="queue-eyebrow">
            PORT KLANG → SENDAYAN
          </span>

          <h2>Dispatch queue</h2>
          <p>Watch your Roll ID. Move to loading when called.</p>
        </div>

        <div className="queue-heading-actions">
          <time dateTime={now.toISOString()}>
            {now.toLocaleTimeString("en-GB", {
              timeZone: "Asia/Kuala_Lumpur",
              hour: "2-digit",
              minute: "2-digit",
            })}

            <small>Malaysia time</small>
          </time>

          <button
            ref={displayButton}
            className="secondary"
            onClick={() => setDisplayMode(!displayMode)}
            aria-pressed={displayMode}
          >
            {displayMode ? (
              <Minimize2 size={16} />
            ) : (
              <Maximize2 size={16} />
            )}

            {displayMode ? "Exit display" : "Display mode"}
          </button>
        </div>
      </header>

      <div className="queue-columns">
        {columns.map(({ key, title, note, icon: Icon }) => (
          <section
            key={key}
            className={`queue-column queue-${key}`}
            aria-label={title}
          >
            <header>
              <span className="queue-column-icon">
                <Icon size={20} />
              </span>

              <div>
                <h3>{title}</h3>
                <p>{note}</p>
              </div>

              <span className="queue-count">
                {queue[key].length}
              </span>
            </header>

            <div className="queue-rolls">
              {queue[key].map((roll) => (
                <article
                  className="queue-ticket"
                  key={roll.id}
                >
                  <div className="queue-ticket-top">
                    <span>ROLL</span>
                    <span>{roll.model}</span>
                  </div>

                  <strong className="queue-number">
                    {roll.id.slice(-4)}
                  </strong>

                  <span className="queue-full-id">
                    {roll.id}
                  </span>

                  <div className="queue-ticket-details">
                    <span>{roll.length} m</span>

                    <span>
                      {key === "dispatched"
                        ? "PK → SDY"
                        : roll.location}
                    </span>
                  </div>

                  {!displayMode && key === "waiting" && (
                    <button
                      className="queue-call"
                      onClick={() => onCall(roll.id)}
                    >
                      Call for loading
                      <ArrowRight size={14} />
                    </button>
                  )}

                  {!displayMode && key === "loading" && (
                    <button
                      className="queue-return"
                      onClick={() => onRemove(roll.id)}
                    >
                      <X size={13} />
                      Return to waiting
                    </button>
                  )}
                </article>
              ))}

              {queue[key].length === 0 && (
                <div className="queue-empty">
                  <Icon size={26} />

                  <strong>
                    {key === "waiting"
                      ? "Queue is clear"
                      : key === "loading"
                        ? "Ready for the next roll"
                        : "No rolls in transit"}
                  </strong>

                  <span>
                    {key === "loading"
                      ? "Call a waiting roll for loading."
                      : "Rolls appear here as their status changes."}
                  </span>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="queue-footer">
        <span>
          Mock queue · session only · roll numbers, not shipment numbers
        </span>

        {!displayMode ? (
          <div>
            <button
              className="secondary"
              disabled={!queue.waiting.length}
              onClick={() => onCall(queue.waiting[0].id)}
            >
              Call next roll
              <ArrowRight size={15} />
            </button>

            <button
              disabled={!queue.loading.length}
              onClick={onConfirm}
            >
              <Truck size={16} />
              Confirm dispatch ({queue.loading.length})
            </button>
          </div>
        ) : (
          <span>Read-only display · Esc to exit</span>
        )}
      </footer>
    </section>
  );
}