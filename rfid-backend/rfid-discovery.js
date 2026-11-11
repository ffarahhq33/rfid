
/*
  SUGIHARA RFID DISCOVERY
  Station 2 - Port Klang

  Automatically collects unique EPCs received
  from the authenticated Raspberry Pi reader.

  Discovery only:
  - Does not register rolls
  - Does not dispatch
  - Does not modify SQLite
  - Stores temporary EPC data in memory
*/

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function registerRfidDiscovery(app, db) {
  const discovered = new Map();

  const tokenPath = path.join(
    __dirname,
    ".rfid_ingest_token"
  );

  if (!fs.existsSync(tokenPath)) {
    throw new Error("RFID ingest token not found");
  }

  const token = fs.readFileSync(tokenPath, "utf8").trim();

  function isAuthorized(req) {
    const supplied = req.get("x-rfid-token") || "";

    const a = Buffer.from(supplied);
    const b = Buffer.from(token);

    return (
      a.length === b.length &&
      a.length > 0 &&
      crypto.timingSafeEqual(a, b)
    );
  }

  function isLocal(req) {
    const ip = req.ip || req.socket.remoteAddress || "";
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1"
    );
  }

  // Capture authenticated scans before reader-ingest
  app.use("/api/station2/scan/reader", (req, res, next) => {
    if (req.method !== "POST") return next();

    if (!isAuthorized(req)) return next();

    const epc = String(req.body?.epc || "")
      .trim()
      .toUpperCase();

    if (
      req.body?.plant !== "PK" ||
      !/^[A-F0-9]{24}$/.test(epc)
    ) {
      return next();
    }

    const now = new Date().toISOString();

    const previous = discovered.get(epc);

    discovered.set(epc, {
      epc,
      firstSeen: previous?.firstSeen || now,
      lastSeen: now,
      readCount: (previous?.readCount || 0) + 1
    });

    // Bound memory use
    if (discovered.size > 2000) {
      const oldest = [...discovered.entries()]
        .sort(
          (a, b) =>
            new Date(a[1].lastSeen) -
            new Date(b[1].lastSeen)
        );

      for (const [key] of oldest.slice(0, 500)) {
        discovered.delete(key);
      }
    }

    // Continue to existing API validation
    next();
  });

  // Read discovery queue on Windows localhost only
  app.get("/api/station2/discovery", (req, res) => {
    if (!isLocal(req)) {
      return res.status(403).json({
        success: false,
        message: "Discovery list restricted to localhost"
      });
    }

    const lookup = db.prepare(
      "SELECT epc, serial, model_code, lot_no, status FROM rolls WHERE epc = ?"
    );

    const tags = [...discovered.values()]
      .map((item) => {
        const roll = lookup.get(item.epc);

        return {
          ...item,
          registered: Boolean(roll),
          status: roll?.status || "UNREGISTERED",
          serial: roll?.serial || null,
          model_code: roll?.model_code || null,
          lot_no: roll?.lot_no || null
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastSeen) -
          new Date(a.lastSeen)
      );

    res.json({
      success: true,
      total: tags.length,
      unregistered: tags.filter(
        (item) => !item.registered
      ).length,
      tags
    });
  });

  console.log("[RFID DISCOVERY] Ready");
}

module.exports = { registerRfidDiscovery };
