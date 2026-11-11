const { registerDispatchPreparation } = require('./dispatch-preparation');

const express = require('express');
const cors = require('cors');
const db = require('./database');
const { registerReaderIngest } = require('./reader-ingest');
const { registerRfidDiscovery } = require('./rfid-discovery');

const app = express();
const PORT = 3001;

// ==========================================
// STATION 2 - PK RFID DISPATCH
// DEVELOPMENT MODE
// ==========================================

app.use(cors({
  origin: 'http://localhost:5173'
}));

app.use(express.json({ limit: '100kb' }));

// Temporary simulated scanned batch
const scannedBatch = new Map();

// Prevent simultaneous dispatch requests
let dispatchBusy = false;

// ==========================================
// 1. BACKEND STATUS
// ==========================================

app.get('/api/status', (req, res) => {
  res.json({
    system: 'Sugihara RFID Roll Tracking',
    station: 'Station 2 - PK Dispatch',
    backend: 'Node.js + Express',
    status: 'ONLINE',
    database: 'SQLite Connected',
    mode: 'DEVELOPMENT'
  });
});

// ==========================================
// 2. DASHBOARD API
// ==========================================

app.get('/api/station2/dashboard', (req, res) => {
  try {
    const shipmentsOnRoad = db.prepare(`
      SELECT COUNT(*) AS total
      FROM shipments
      WHERE status = 'OUT'
    `).get().total;

    const inventoryRolls = db.prepare(`
      SELECT COUNT(*) AS total
      FROM rolls
      WHERE status = 'REGISTERED'
    `).get().total;

    const shipments = db.prepare(`
      SELECT lot_no, qty, departed_at, status
      FROM shipments
      WHERE status = 'OUT'
      ORDER BY departed_at DESC
    `).all();

    const scanRolls = [...scannedBatch.values()];

    const modelTypes = new Set(
      scanRolls.map(r => r.model_code)
    ).size;

    res.json({
      station: 'Gate A',
      location: 'Port Klang',
      scannedRolls: scanRolls.length,
      modelTypes,
      activeTags: scanRolls.length,
      inventoryRolls,
      shipmentsOnRoad,
      rolls: scanRolls,
      shipments,
      source: 'SQLITE_DEVELOPMENT',
      scannerMode: 'SIMULATION'
    });

  } catch (error) {
    console.error('[DASHBOARD ERROR]', error);

    res.status(500).json({
      error: 'Database query failed'
    });
  }
});

// ==========================================
// 3. REGISTERED RFID ROLLS
// ==========================================

app.get('/api/station2/rolls', (req, res) => {
  try {
    const rolls = db.prepare(`
      SELECT epc, serial, model_code, lot_no,
             length_m, weight_kg,
             status, ship_id
      FROM rolls
      ORDER BY epc
    `).all();

    res.json({
      rolls,
      total: rolls.length
    });

  } catch (error) {
    console.error('[ROLLS ERROR]', error);

    res.status(500).json({
      error: 'Failed to load rolls'
    });
  }
});

// ==========================================
// 4. SIMULATE RFID SCAN
// ==========================================

app.post('/api/station2/scan/simulate', (req, res) => {
  try {
    if (dispatchBusy) {
      return res.status(409).json({
        success: false,
        message: 'Dispatch processing in progress'
      });
    }

    const epc = String(req.body?.epc || '')
      .trim()
      .toUpperCase();

    if (!/^[A-F0-9]{8,64}$/.test(epc)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid EPC format'
      });
    }

    const roll = db.prepare(`
      SELECT epc, serial, model_code, lot_no,
             length_m, weight_kg,
             status, ship_id
      FROM rolls
      WHERE epc = ?
    `).get(epc);

    if (!roll) {
      return res.status(404).json({
        success: false,
        message: 'Unknown RFID tag'
      });
    }

    if (
      roll.status !== 'REGISTERED' ||
      String(roll.ship_id || '').trim() !== ''
    ) {
      return res.status(409).json({
        success: false,
        message: 'Roll is not eligible for dispatch'
      });
    }

    if (scannedBatch.has(epc)) {
      return res.json({
        success: true,
        duplicate: true,
        message: 'RFID already scanned',
        count: scannedBatch.size
      });
    }

    if (scannedBatch.size >= 500) {
      return res.status(400).json({
        success: false,
        message: 'Maximum batch size is 500 rolls'
      });
    }

    const scannedRoll = {
      ...roll,
      scannedAt: new Date().toISOString(),
      rssi: null
    };

    scannedBatch.set(epc, scannedRoll);

    console.log('[SIMULATED SCAN]', epc);

    res.json({
      success: true,
      duplicate: false,
      message: 'RFID scan accepted',
      roll: scannedRoll,
      count: scannedBatch.size
    });

  } catch (error) {
    console.error('[SCAN ERROR]', error);

    res.status(500).json({
      success: false,
      message: 'RFID scan processing failed'
    });
  }
});

// ==========================================
// 5. CURRENT SCANNED BATCH
// ==========================================

app.get('/api/station2/scans', (req, res) => {
  const rolls = [...scannedBatch.values()];

  const modelTypes = new Set(
    rolls.map(r => r.model_code)
  ).size;

  res.json({
    station: 'Gate A',
    scannedRolls: rolls.length,
    modelTypes,
    activeTags: rolls.length,
    rolls,
    source: 'SIMULATION'
  });
});

// ==========================================
// 6. CLEAR SCANNED BATCH
// ==========================================

app.post('/api/station2/scans/clear', (req, res) => {
  if (dispatchBusy) {
    return res.status(409).json({
      success: false,
      message: 'Cannot clear during dispatch'
    });
  }

  const previousCount = scannedBatch.size;
  scannedBatch.clear();

  res.json({
    success: true,
    message: 'Scanned batch cleared',
    previousCount,
    currentCount: 0
  });
});

// ==========================================
// 7. ATOMIC DISPATCH TRANSACTION
// ==========================================

const commitDispatch = db.transaction(
  (shipmentId, epcs) => {

    // Check for unresolved dispatch requests
    const pending = db.prepare(`
      SELECT shipment_id
      FROM dispatch_requests
      WHERE state = 'PENDING'
      LIMIT 1
    `).get();

    if (pending) {
      throw new Error(
        `Pending dispatch requires review: ${pending.shipment_id}`
      );
    }

    // Check for duplicate shipment ID
    const existing = db.prepare(`
      SELECT lot_no
      FROM shipments
      WHERE lot_no = ?
    `).get(shipmentId);

    if (existing) {
      throw new Error('Shipment ID already exists');
    }

    const getRoll = db.prepare(`
      SELECT epc, status, ship_id
      FROM rolls
      WHERE epc = ?
    `);

    // Revalidate all EPCs
    for (const epc of epcs) {
      const roll = getRoll.get(epc);

      if (!roll) {
        throw new Error(`Unknown EPC: ${epc}`);
      }

      if (
        roll.status !== 'REGISTERED' ||
        String(roll.ship_id || '').trim() !== ''
      ) {
        throw new Error(
          `Roll not available: ${epc}`
        );
      }
    }

    const now = new Date().toISOString();

    // Record dispatch request
    db.prepare(`
      INSERT INTO dispatch_requests
      (shipment_id, epcs_json, state,
       created_at, updated_at)
      VALUES (?, ?, 'COMMITTED', ?, ?)
    `).run(
      shipmentId,
      JSON.stringify(epcs),
      now,
      now
    );

    // Create shipment
    db.prepare(`
      INSERT INTO shipments
      (lot_no, model_code, qty,
       departed_at, status, priority)
      VALUES (?, 'MIXED', ?, ?, 'OUT', 1)
    `).run(
      shipmentId,
      epcs.length,
      now
    );

    const linkRoll = db.prepare(`
      INSERT INTO shipment_rolls
      (lot_no, epc)
      VALUES (?, ?)
    `);

    const updateRoll = db.prepare(`
      UPDATE rolls
      SET status = 'OUT',
          ship_id = ?
      WHERE epc = ?
        AND status = 'REGISTERED'
        AND (
          ship_id IS NULL
          OR TRIM(ship_id) = ''
        )
    `);

    // Link and update each roll
    for (const epc of epcs) {
      linkRoll.run(shipmentId, epc);

      const result = updateRoll.run(
        shipmentId,
        epc
      );

      if (result.changes !== 1) {
        throw new Error(
          `Roll update failed: ${epc}`
        );
      }
    }

    // Verify shipment linkage
    const linked = db.prepare(`
      SELECT epc
      FROM shipment_rolls
      WHERE lot_no = ?
    `).all(shipmentId).map(r => r.epc);

    const updated = db.prepare(`
      SELECT epc
      FROM rolls
      WHERE ship_id = ?
        AND status = 'OUT'
    `).all(shipmentId).map(r => r.epc);

    const expected = new Set(epcs);

    const matches = values =>
      values.length === expected.size &&
      new Set(values).size === expected.size &&
      values.every(epc => expected.has(epc));

    if (!matches(linked) || !matches(updated)) {
      throw new Error(
        'Shipment EPC verification failed'
      );
    }

    // Save audit event
    db.prepare(`
      INSERT INTO events
      (ts, lot_no, stage, detail)
      VALUES (?, ?, 'OUT', ?)
    `).run(
      now,
      shipmentId,
      `Dispatched ${epcs.length} rolls from Gate A`
    );

    return {
      shipmentId,
      quantity: epcs.length,
      epcs,
      departedAt: now,
      status: 'OUT'
    };
  }
);

// ==========================================
// 8. DISPATCH API
// ==========================================

app.post('/api/station2/dispatch', (req, res, next) => {
  // DISPATCH_SAFETY_LOCK_V1
  return res.status(403).json({
    success: false,
    message: "Dispatch temporarily locked during development"
  });
}, (req, res) => {
  if (dispatchBusy) {
    return res.status(409).json({
      success: false,
      message: 'Another dispatch is in progress'
    });
  }

  dispatchBusy = true;

  try {
    const shipmentId = String(
      req.body?.shipmentId || ''
    ).trim();

    if (!/^[A-Za-z0-9_-]{1,64}$/.test(shipmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment ID'
      });
    }

    const epcs = [...scannedBatch.keys()];

    if (epcs.length === 0 || epcs.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Batch must contain 1 to 500 rolls'
      });
    }

    // SQLite commits all operations together
    const result = commitDispatch(
      shipmentId,
      epcs
    );

    // Clear scan session only after commit
    scannedBatch.clear();

    console.log(
      '[DISPATCH SUCCESS]',
      result.shipmentId,
      result.quantity
    );

    res.json({
      success: true,
      message: 'Shipment dispatched and verified',
      ...result
    });

  } catch (error) {
    console.error(
      '[DISPATCH ERROR]',
      error
    );

    res.status(409).json({
      success: false,
      message: error.message
    });

  } finally {
    dispatchBusy = false;
  }
});

// ==========================================
// 9. SHIPMENT HISTORY
// ==========================================

app.get('/api/station2/shipments', (req, res) => {
  try {
    const shipments = db.prepare(`
      SELECT
        lot_no AS shipmentId,
        qty,
        departed_at AS departedAt,
        status
      FROM shipments
      ORDER BY departed_at DESC
    `).all();

    res.json({
      shipments,
      total: shipments.length
    });

  } catch (error) {
    console.error('[SHIPMENTS ERROR]', error);

    res.status(500).json({
      error: 'Failed to load shipments'
    });
  }
});

registerDispatchPreparation(app, scannedBatch);
registerRfidDiscovery(app, db);
// ==========================================
// START BACKEND
// ==========================================
registerReaderIngest(
  app,
  db,
  scannedBatch,
  () => dispatchBusy
);

app.listen(PORT, '0.0.0.0', () => {
  console.log('================================');
  console.log('SUGIHARA RFID ROLL TRACKING');
  console.log('Station 2 - PK Dispatch');
  console.log(`Backend: http://localhost:${PORT}`);
  console.log('Database: SQLite Development');
  console.log('Scanner: SIMULATION MODE');
  console.log('Dispatch: SQLITE TRANSACTION ENABLED');
  console.log('================================');
});
