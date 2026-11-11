
const express = require("express");
const pool = require("../../config/db");
const { registerScanRoutes } = require("./scan-routes");

const router = express.Router();

// ========================================
// SHARED TEMPORARY SCAN STORAGE
// ========================================
const scannedBatch = new Map();

// Register simulation and real reader endpoints
registerScanRoutes(router, pool, scannedBatch);

// ========================================
// 1. STATION 2 STATUS
// ========================================
router.get("/status", (req, res) => {
  res.json({
    station: "Station 2",
    location: "Port Klang",
    backend: "Node.js + PostgreSQL",
    status: "ONLINE",
    dispatchEnabled: false
  });
});

// ========================================
// 2. STATION 2 DASHBOARD
// ========================================
router.get("/dashboard", async (req, res) => {
  try {
    const inventoryResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM rolls
      WHERE status = 'REGISTERED'
    `);

    const shipmentResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM shipments
      WHERE status = 'OUT'
    `);

    const shipmentsResult = await pool.query(`
      SELECT lot_no, qty, departed_at, status
      FROM shipments
      WHERE status = 'OUT'
      ORDER BY departed_at DESC
    `);

    const rolls = [...scannedBatch.values()];

    const modelTypes = new Set(
      rolls.map(r => r.model_code)
    ).size;

    res.json({
      station: "Gate A",
      location: "Port Klang",
      scannedRolls: rolls.length,
      modelTypes,
      activeTags: rolls.length,
      inventoryRolls: inventoryResult.rows[0].total,
      shipmentsOnRoad: shipmentResult.rows[0].total,
      rolls,
      shipments: shipmentsResult.rows,
      source: "POSTGRESQL",
      scannerMode: "SIMULATION_OR_READER"
    });

  } catch (error) {
    console.error("[STATION 2 DASHBOARD]", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard"
    });
  }
});

// ========================================
// 3. REGISTERED RFID ROLLS
// ========================================
router.get("/rolls", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        epc,
        serial,
        model_code,
        lot_no,
        length_m,
        weight_kg,
        status,
        ship_id
      FROM rolls
      ORDER BY epc
    `);

    res.json({
      rolls: result.rows,
      total: result.rowCount
    });

  } catch (error) {
    console.error("[STATION 2 ROLLS]", error);

    res.status(500).json({
      success: false,
      message: "Failed to load rolls"
    });
  }
});

// ========================================
// 4. CURRENT RFID SCANS
// ========================================
router.get("/scans", (req, res) => {
  const rolls = [...scannedBatch.values()];

  const modelTypes = new Set(
    rolls.map(r => r.model_code)
  ).size;

  res.json({
    station: "Gate A",
    scannedRolls: rolls.length,
    modelTypes,
    activeTags: rolls.length,
    rolls,
    source: "MEMORY"
  });
});

// ========================================
// 5. CLEAR SCANNED BATCH
// ========================================
router.post("/scans/clear", (req, res) => {
  const previousCount = scannedBatch.size;

  scannedBatch.clear();

  res.json({
    success: true,
    message: "Scanned batch cleared",
    previousCount,
    currentCount: 0
  });
});

// ========================================
// 6. PREPARE DISPATCH (READ ONLY)
// ========================================
router.get("/dispatch/prepare", (req, res) => {
  const rolls = [...scannedBatch.values()];

  res.json({
    success: true,
    dispatchEnabled: false,
    totalScanned: rolls.length,
    rolls
  });
});

// ========================================
// 7. DISPATCH SAFETY LOCK
// ========================================
router.post("/dispatch", (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Dispatch locked during PostgreSQL migration"
  });
});

// ========================================
// EXPORT STATION 2 ROUTER
// ========================================
module.exports = router;
