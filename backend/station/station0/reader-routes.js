
const crypto = require("crypto");

function registerReaderRoutes(router) {

  // Temporary latest scan
  let latestScan = null;

  function authenticate(req, res, next) {
    const expected =
      process.env.STATION0_READER_TOKEN || "";

    const supplied =
      req.get("x-reader-token") || "";

    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);

    if (
      !expected ||
      a.length !== b.length ||
      !crypto.timingSafeEqual(a, b)
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized RFID reader"
      });
    }

    next();
  }

  // ====================================
  // RECEIVE EPC FROM RASPBERRY PI
  // ====================================
  router.post(
    "/reader/scan",
    authenticate,
    (req, res) => {
      const epc = String(req.body?.epc || "")
        .trim()
        .toUpperCase();

      if (
        !/^[A-F0-9]{8,64}$/.test(epc) ||
        epc.length % 2 !== 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFID EPC"
        });
      }

      latestScan = {
        epc,
        scannedAt: new Date().toISOString(),
        source: "STATION_0_READER"
      };

      console.log("[STATION 0 RFID]", epc);

      res.json({
        success: true,
        message: "RFID tag received",
        scan: latestScan
      });
    }
  );

  // ====================================
  // VIEW LATEST SCANNED TAG
  // ====================================
  router.get(
    "/reader/latest",
    authenticate,
    (req, res) => {
      res.json({
        success: true,
        scan: latestScan
      });
    }
  );
}

module.exports = { registerReaderRoutes };
