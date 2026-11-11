
const crypto = require("crypto");

function registerScanRoutes(router, pool, scannedBatch) {

  // Validate hexadecimal EPC.
  function normalizeEpc(value) {
    const epc = String(value || "")
      .trim()
      .toUpperCase();

    if (
      !/^[A-F0-9]{8,64}$/.test(epc) ||
      epc.length % 2 !== 0
    ) {
      return null;
    }

    return epc;
  }

  // Authenticate Raspberry Pi requests.
  function authorized(req) {
    const expected = process.env.RFID_INGEST_TOKEN;
    const supplied = req.get("x-rfid-token") || "";

    if (!expected || !supplied) return false;

    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);

    return a.length === b.length &&
      crypto.timingSafeEqual(a, b);
  }

  // Look up roll in PostgreSQL.
  async function findRoll(epc) {
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
      WHERE epc = $1
    `, [epc]);

    return result.rows[0] || null;
  }

  // Shared scan processing.
  async function processScan(req, res, source) {
    try {
      const epc = normalizeEpc(req.body?.epc);

      if (!epc) {
        return res.status(400).json({
          success: false,
          message: "Invalid EPC format"
        });
      }

      const roll = await findRoll(epc);

      if (!roll) {
        return res.status(404).json({
          success: false,
          message: "RFID tag not registered"
        });
      }

      if (
        roll.status !== "REGISTERED" ||
        String(roll.ship_id || "").trim() !== ""
      ) {
        return res.status(409).json({
          success: false,
          message: "Roll not eligible for dispatch"
        });
      }

      if (scannedBatch.has(epc)) {
        return res.json({
          success: true,
          duplicate: true,
          message: "RFID already scanned",
          count: scannedBatch.size
        });
      }

      if (scannedBatch.size >= 500) {
        return res.status(409).json({
          success: false,
          message: "Scan batch limit reached"
        });
      }

      const rssi = req.body?.rssi;
      const scannedRoll = {
        ...roll,
        scannedAt: new Date().toISOString(),
        scanSource: source,
        rssi: Number.isInteger(rssi) &&
          rssi >= -128 && rssi <= 127
          ? rssi : null
      };

      scannedBatch.set(epc, scannedRoll);

      console.log("[STATION 2 SCAN]", epc, source);

      return res.json({
        success: true,
        duplicate: false,
        message: "RFID scan accepted",
        roll: scannedRoll,
        count: scannedBatch.size
      });

    } catch (error) {
      console.error("[RFID SCAN ERROR]", error);

      return res.status(500).json({
        success: false,
        message: "RFID scan failed"
      });
    }
  }

  // 1. Development simulation.
  router.post("/scan/simulate", (req, res) => {
    const ip = req.ip || "";

    const isLocal = [
      "127.0.0.1",
      "::1",
      "::ffff:127.0.0.1"
    ].includes(ip);

    if (
      process.env.NODE_ENV === "production" ||
      !isLocal
    ) {
      return res.status(403).json({
        success: false,
        message: "Simulation restricted to local development"
      });
    }

    return processScan(req, res, "SIMULATION");
  });

  // 2. Authenticated Raspberry Pi scan.
  router.post("/scan/reader", (req, res) => {
    if (!authorized(req)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized RFID reader"
      });
    }

    if (req.body?.plant !== "PK") {
      return res.status(400).json({
        success: false,
        message: "Invalid plant"
      });
    }

    return processScan(req, res, "RFID_READER");
  });
}

module.exports = { registerScanRoutes };
