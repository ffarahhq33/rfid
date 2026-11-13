"use strict";

const express = require("express");
const crypto = require("crypto");
const pool = require("../../config/db");
const router = express.Router();

// Read-only Station 1 API. Reuses the current server-side dashboard credential.
function requireDashboardToken(req, res, next) {
  const expected = process.env.STATION0_API_TOKEN || "";
  const received = req.get("x-station0-token") || "";
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, message: "Unauthorized inventory request" });
  }
  next();
}

router.get("/inventory", requireDashboardToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT roll_id, epc, model_code, lot_no, length_m,
             storage_location, current_station, status, registered_at
      FROM rolls
      WHERE current_station = 'STATION_1' AND status = 'AVAILABLE'
      ORDER BY registered_at DESC NULLS LAST, roll_id DESC
    `);
    return res.json({ success: true, rolls: result.rows, total: result.rowCount });
  } catch (error) {
    console.error('[STATION 1 INVENTORY]', error);
    return res.status(500).json({ success: false, message: 'Could not load PK storage inventory' });
  }
});

module.exports = router;
