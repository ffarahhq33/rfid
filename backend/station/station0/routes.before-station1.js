"use strict";

const express = require("express");
const crypto = require("crypto");
const pool = require("../../config/db");
const { registerReaderRoutes } = require("./reader-routes");
const { registerHistoryRoutes } = require("./registration-history-routes");

const router = express.Router();

// Preserve the physical RFID reader's existing endpoints.
registerReaderRoutes(router);

// Registration API authentication (the frontend dev proxy adds this header).
function verifyToken(req, res, next) {
  const expected = process.env.STATION0_API_TOKEN || "";
  const received = req.get("x-station0-token") || "";
  const a = Buffer.from(expected);
  const b = Buffer.from(received);

  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized registration request"
    });
  }
  next();
}

router.get("/status", (req, res) => {
  res.json({
    station: "Station 0",
    name: "RFID Registration",
    location: "Port Klang",
    status: "ONLINE",
    database: "PostgreSQL"
  });
});

// Accepts the new team form and remains compatible with the previous form.
// Team form: { epc, model, lot, length, location }
// Legacy form: { epc, model_name, length_m, date_of_birth }
router.post("/register", verifyToken, async (req, res) => {
  const body = req.body || {};
  const tagId = String(body.epc || "").trim().toUpperCase();
  const model = String(body.model ?? body.model_name ?? "").trim();
  const lengthInput = body.length ?? body.length_m;
  const length = Number(lengthInput);
  const lot = String(body.lot ?? body.lot_no ?? "").trim();
  const storageLocation = String(body.location ?? body.storage_location ?? "").trim();
  const dobInput = body.date_of_birth;

  if (!/^[A-F0-9]{8,64}$/.test(tagId) || tagId.length % 2 !== 0) {
    return res.status(400).json({ success: false, message: "Invalid RFID EPC" });
  }
  if (!model || model.length > 100) {
    return res.status(400).json({ success: false, message: "Valid model code is required" });
  }
  if (lengthInput === null || lengthInput === undefined || lengthInput === "" ||
      !Number.isFinite(length) || length <= 0) {
    return res.status(400).json({ success: false, message: "Valid roll length is required" });
  }
  if (lot.length > 100) {
    return res.status(400).json({ success: false, message: "Lot number is too long" });
  }
  if (storageLocation && !["PK-A01", "PK-A02", "PK-A03"].includes(storageLocation)) {
    return res.status(400).json({ success: false, message: "Invalid PK storage location" });
  }

  // Legacy DOB remains optional. The new team form uses registered_at instead.
  let dob = null;
  if (dobInput !== null && dobInput !== undefined && dobInput !== "") {
    dob = String(dobInput);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return res.status(400).json({ success: false, message: "DOB must use YYYY-MM-DD" });
    }
    const parsed = new Date(dob + "T00:00:00Z");
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dob) {
      return res.status(400).json({ success: false, message: "Invalid date of birth" });
    }
  }

  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    // Keep the existing duplicate EPC protection. Unique constraint remains
    // the final safeguard against concurrent registrations.
    const existing = await client.query(
      "SELECT epc, roll_id FROM rolls WHERE epc = $1", [tagId]
    );
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: "RFID tag already registered",
        existingRoll: existing.rows[0]
      });
    }

    // Transaction-safe, Malaysia-local registration date sequence.
    const counter = await client.query(`
      INSERT INTO roll_id_counters (plant, roll_date, last_number)
      VALUES ('PK', (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::date, 1)
      ON CONFLICT (plant, roll_date)
      DO UPDATE SET last_number = roll_id_counters.last_number + 1
      RETURNING to_char(roll_date, 'YYYYMMDD') AS date_code, last_number
    `);
    const { date_code, last_number } = counter.rows[0];
    const rollId = `RF-PK-${date_code}-${String(last_number).padStart(4, "0")}`;

    // Database is source of truth. registered_at uses the DB clock.
    // Planned storage slot does not change the physical processing station.
    const result = await client.query(`
      INSERT INTO rolls (
        roll_id, epc, serial, model_code, lot_no, length_m,
        date_of_birth, storage_location, registered_at,
        current_station, status, ship_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, NOW(), 'STATION_0', 'REGISTERED', NULL
      )
      RETURNING
        roll_id, epc, model_code, lot_no, length_m,
        date_of_birth::text AS date_of_birth,
        storage_location,
        to_char(registered_at AT TIME ZONE 'Asia/Kuala_Lumpur',
                'YYYY-MM-DD HH24:MI:SS') AS registered_at_myt,
        registered_at, current_station, status
    `, [
      rollId, tagId, rollId, model, lot || null, length,
      dob, storageLocation || null
    ]);

    // Preserve immutable first movement event.
    await client.query(`
      INSERT INTO roll_movements (
        roll_id, from_station, to_station, movement_type, remarks
      ) VALUES ($1, NULL, 'STATION_0', 'REGISTERED',
                'Roll registered at Port Klang')
    `, [rollId]);

    await client.query("COMMIT");
    transactionStarted = false;
    return res.status(201).json({
      success: true,
      message: "RFID roll registered successfully",
      roll: result.rows[0]
    });
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK").catch(err =>
        console.error("Rollback failed:", err)
      );
    }
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "RFID EPC or Roll ID already exists"
      });
    }
    console.error("[STATION 0 ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  } finally {
    if (client) client.release();
  }
});

// Preserve the separately implemented PostgreSQL history endpoint.
registerHistoryRoutes(router, pool, verifyToken);
module.exports = router;
