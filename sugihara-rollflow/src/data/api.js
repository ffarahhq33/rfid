// Data seam. Everything the interface reads or writes goes through here.
//
// Nothing leaves the browser today and no database is touched: these
// functions resolve from the in-memory demo records. When the backend is
// connected, replace the bodies with real requests; the interface already
// handles loading (skeletons), optimistic updates and rollback around them.
import { initialRolls } from "./mock";

// Simulated network delay so the loading states can be seen in the preview.
// Set to 0 (or delete the waits) once real requests are in place.
export const MOCK_LATENCY_MS = 700;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loadRolls() {
  await wait(MOCK_LATENCY_MS);
  return initialRolls;
}

// Is this EPC free to assign? Resolves { available: true } or
// { available: false, rollId } naming the roll that already holds it.
// Station 0: consult PostgreSQL for tag availability (not the demo array).
// The backend still performs the definitive duplicate check when saving.
export async function checkTag(epc, _rolls) {
  const records = await loadStation0Registrations();
  const hit = records.find((r) => r.epc?.toUpperCase() === epc.toUpperCase());
  return hit ? { available: false, rollId: hit.id } : { available: true };
}

// The Pi posts accepted scans to Node.js; React only reads the latest scan.
// Vite attaches the reader token server-side. No token is sent by browser JS.
export async function loadStation0LatestScan() {
  const response = await fetch('/api/station0/reader/latest', { cache: 'no-store' });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || `Reader request failed: HTTP ${response.status}`);
  }
  if (result?.success === false) {
    throw new Error(result.message || 'Reader unavailable');
  }
  const scan = result?.scan ?? result?.latest ?? result?.data ?? result;
  if (!scan || typeof scan.epc !== 'string' || !scan.epc.trim()) return null;
  return {
    epc: scan.epc.trim().toUpperCase(),
    at: scan.scanned_at ?? scan.received_at ?? scan.timestamp ?? scan.at ?? null,
    rssi: scan.rssi ?? null,
  };
}

export async function saveRollChanges(_ids, _patch) {}

// Station 0: POST is proxied by Vite. Secret stays in the Vite server, never in browser JS.
export async function saveNewRoll(roll) {
  const response = await fetch("/api/station0/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(roll),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !result?.roll?.roll_id) {
    throw new Error(result?.message || `Registration failed: HTTP ${response.status}`);
  }
  return result;
}

// Station 0 database history. This intentionally does not replace loadRolls()
// because the other station pages remain in team demo mode for now.
export async function loadStation0Registrations() {
  const response = await fetch("/api/station0/registrations", { cache: "no-store" });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !Array.isArray(result.rolls)) {
    throw new Error(result?.message || `History request failed: HTTP ${response.status}`);
  }
  return result.rolls.map((roll) => ({
    id: roll.roll_id,
    epc: roll.epc,
    model: roll.model_code,
    lot: roll.lot_no || "—",
    length: Number(roll.length_m),
    location: roll.storage_location || "Unassigned",
    status: roll.status === "AVAILABLE" ? "Available" : (roll.status === "REGISTERED" ? "Registered" : (roll.status || "Unknown")),
    currentStation: roll.current_station,
    registeredAt: roll.registered_at_myt || roll.registered_at || null,
  }));
}

// Station 1 PK Storage: data comes from PostgreSQL (not demo rolls).
export async function loadStation1Inventory() {
  const response = await fetch("/api/station1/inventory", { cache: "no-store" });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !Array.isArray(result.rolls)) {
    throw new Error(result?.message || `PK storage request failed: HTTP ${response.status}`);
  }
  return result.rolls.map((roll) => ({
    id: roll.roll_id,
    epc: roll.epc,
    model: roll.model_code,
    lot: roll.lot_no || "—",
    length: Number(roll.length_m),
    location: roll.storage_location || "Unassigned",
    status: "Available",
    currentStation: roll.current_station,
    registeredAt: roll.registered_at,
  }));
}
