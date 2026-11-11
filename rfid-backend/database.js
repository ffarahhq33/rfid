
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Development database only
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(
  path.join(dataDir, 'rfid_dev.db')
);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Tables based on the existing RFID flow
db.exec(`
  CREATE TABLE IF NOT EXISTS rolls (
    epc TEXT PRIMARY KEY,
    serial TEXT,
    model_code TEXT,
    lot_no TEXT,
    length_m REAL,
    weight_kg REAL,
    produced_at TEXT,
    status TEXT,
    ship_id TEXT
  );

  CREATE TABLE IF NOT EXISTS shipments (
    lot_no TEXT PRIMARY KEY,
    model_code TEXT,
    qty INTEGER,
    lorry_plate TEXT,
    driver TEXT,
    eta TEXT,
    departed_at TEXT,
    status TEXT,
    priority INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS shipment_rolls (
    lot_no TEXT,
    epc TEXT,
    PRIMARY KEY (lot_no, epc)
  );

  CREATE TABLE IF NOT EXISTS dispatch_requests (
    shipment_id TEXT PRIMARY KEY,
    epcs_json TEXT,
    state TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT,
    lot_no TEXT,
    stage TEXT,
    detail TEXT
  );
`);

console.log('SQLite development database ready');

module.exports = db;
