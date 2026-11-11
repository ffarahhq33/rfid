
const express = require("express");
const crypto = require("crypto");
const pool = require("../../config/db");
const { registerReaderRoutes } = require("./reader-routes");
const router = express.Router();
registerReaderRoutes(router);
// ========================================
// REGISTRATION AUTHENTICATION
// ========================================
function verifyToken(req, res, next) {
  const expected = process.env.STATION0_API_TOKEN || "";
  const received = req.get("x-station0-token") || "";

  const a = Buffer.from(expected);
  const b = Buffer.from(received);

  if (
    !expected ||
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized registration request"
    });
  }

  next();
}

// ========================================
// STATION 0 STATUS
// ========================================
router.get("/status", (req, res) => {
  res.json({
    station: "Station 0",
    name: "RFID Registration",
    location: "Port Klang",
    status: "ONLINE",
    database: "PostgreSQL"
  });
});

// ========================================
// REGISTER NEW RFID ROLL
// ========================================
router.post("/register", verifyToken, async (req, res) => {
  const {
    epc,
    model_name,
    length_m,
    date_of_birth
  } = req.body || {};

  const tagId = String(epc || "")
    .trim()
    .toUpperCase();

  const model = String(model_name || "").trim();

  const length = Number(length_m);

  // RFID EPC validation
  if (
    !/^[A-F0-9]{8,64}$/.test(tagId) ||
    tagId.length % 2 !== 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid RFID EPC"
    });
  }

  // Roll information validation
  if (!model || model.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Valid model name is required"
    });
  }

  if (
    length_m === null ||
    length_m === undefined ||
    length_m === "" ||
    !Number.isFinite(length) ||
    length <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid roll length is required"
    });
  }

  // Validate actual calendar date
  const dob = String(date_of_birth || "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return res.status(400).json({
      success: false,
      message: "DOB must use YYYY-MM-DD"
    });
  }

  const date = new Date(dob + "T00:00:00Z");

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dob
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid date of birth"
    });
  }

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    // Check duplicate EPC
    const existing = await client.query(
      "SELECT epc, roll_id FROM rolls WHERE epc = $1",
      [tagId]
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

    // Atomic counter using Malaysia date
    const counter = await client.query(`
      INSERT INTO roll_id_counters (
        plant, roll_date, last_number
      )
      VALUES (
        'PK',
        (NOW() AT TIME ZONE
          'Asia/Kuala_Lumpur')::date,
        1
      )
      ON CONFLICT (plant, roll_date)
      DO UPDATE SET
        last_number =
          roll_id_counters.last_number + 1
      RETURNING
        to_char(roll_date, 'YYYYMMDD')
          AS date_code,
        last_number
    `);

    const { date_code, last_number } =
      counter.rows[0];

    const rollId =
      `RF-PK-${date_code}-${String(last_number)
        .padStart(4, "0")}`;

    // Save new roll
    const result = await client.query(`
      INSERT INTO rolls (
        roll_id,
        epc,
        serial,
        model_code,
        length_m,
        date_of_birth,
        current_station,
        status,
        ship_id
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, 'STATION_0', 'REGISTERED', NULL
      )
      RETURNING
        roll_id, epc, model_code,
        length_m, date_of_birth,
        current_station, status
    `, [
      rollId,
      tagId,
      rollId,
      model,
      length,
      dob
    ]);

    // Record first history event
    await client.query(`
      INSERT INTO roll_movements (
        roll_id,
        from_station,
        to_station,
        movement_type,
        remarks
      )
      VALUES (
        $1, NULL, 'STATION_0',
        'REGISTERED',
        'Roll registered at Port Klang'
      )
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
      await client.query("ROLLBACK").catch(
        err => console.error("Rollback failed:", err)
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

module.exports = router;
