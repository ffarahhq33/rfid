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
export async function checkTag(epc, rolls) {
  await wait(450);
  const hit = rolls.find((r) => r.epc?.toUpperCase() === epc.toUpperCase());
  return hit ? { available: false, rollId: hit.id } : { available: true };
}

export async function saveRollChanges(_ids, _patch) {}

export async function saveNewRoll(_roll) {}
