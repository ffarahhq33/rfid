# SUGIHARA RollFlow

React + Vite frontend prototype. No Express, database or reader changes.

## Develop

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
npm run build
```

## Structure

- `src/main.jsx`: React application entry point
- `src/App.jsx`: app shell, navigation, session state and dialogs
- `src/components/UI.jsx`: cards, KPIs, table, search, scanner, loading and dialog components
- `src/pages/Dashboard.jsx`: operations overview
- `src/pages/Stations.jsx`: six operational views, reports and settings
- `src/data/mock.js`: illustrative roll records and page metadata
- `src/styles.css`: blue theme and responsive layouts

## Demo behavior

Records are in memory and reset on reload. Registration generates a demo Roll ID, validates EPC format, and prevents duplicate active EPC assignments. Dispatch, receipt, production issue, completion and tag release operate on eligible mock records through confirmation dialogs. Release retains roll records and event history, including the former EPC in release events. Reports export filtered CSV. Stock thresholds are configurable for the current session.

Sample EPCs are displayed beneath each Roll ID. Copy one into the station's scanner field to try a mock operation. All hardware indicators remain disconnected. The snapshot is dated 10 November 2026.

Backend integration must replace demo IDs with server-generated IDs, UUIDs and server-side uniqueness constraints; implement authoritative lifecycle transitions, authentication, concurrent transactions, shipments, receipts, tag assignment histories and audit records. Demo access is not authorization. Transport reference is a visual field in this prototype; full shipment records are not yet implemented. Production reports beyond CSV and detailed user/location/model management remain interface expansion work.

## Getting started in VS Code

1. Extract the ZIP and open the `sugihara-rollflow` folder in VS Code.
2. Open a terminal in that folder.
3. Run `npm ci` to install the locked dependencies.
4. Run `npm run dev` and open the local address printed by Vite.
5. Use `npm run build` to produce the static production bundle in `dist`.

## Frontend walkthrough

- Register: enter a unique hexadecimal EPC, model, lot, positive length and PK location.
- Dispatch: copy an available roll's EPC into the scanner input, add the scan, then confirm.
- Receive: use that same EPC in SDY Receiving and confirm its receiving location.
- Issue: select “Issue to production” in SDY Storage and scan the received roll.
- Consume: select “Complete consumption” and scan the issued roll.
- Release: scan the completed roll in Tag Reset and confirm release.
- Reuse: register a new roll with the released EPC. Its Roll ID is distinct; the former roll remains in Reports.

The reusable `Loading` component is supplied for later asynchronous API integration. No loading delay is simulated for synchronous mock data. No backend service or secret environment variables are required.

## Colour palette

Bright Snow `#F8F9FB`, Alice Blue `#E1ECF7`, Powder Blue `#AECBEB`, Cool Horizon `#83B0E1` and `#71A5DE`. Dark blue text provides readable contrast on the pastel surfaces. Success and pending statuses retain green and amber. Theme overrides are at the end of `src/styles.css`.
