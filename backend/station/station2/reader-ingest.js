
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function registerReaderIngest(
  app,
  db,
  scannedBatch,
  isDispatchBusy
) {
  // Development-only authentication token.
  // Keep this file private and out of Git.
  const tokenPath = path.join(
    __dirname,
    '.rfid_ingest_token'
  );

  if (!fs.existsSync(tokenPath)) {
    fs.writeFileSync(
      tokenPath,
      crypto.randomBytes(32).toString('hex') + '\n',
      { flag: 'wx' }
    );
  }

  const token = fs.readFileSync(
    tokenPath,
    'utf8'
  ).trim();

  if (!token || token.length < 32) {
    throw new Error(
      'RFID ingestion token is missing or invalid'
    );
  }

  function authorized(req) {
    const supplied = req.get('x-rfid-token') || '';

    const a = Buffer.from(supplied);
    const b = Buffer.from(token);

    return a.length === b.length &&
      crypto.timingSafeEqual(a, b);
  }

  // =====================================
  // RECEIVE RFID EPC FROM PYTHON
  // =====================================

  app.post('/api/station2/scan/reader', (req, res) => {

    if (!authorized(req)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized RFID reader'
      });
    }

    if (isDispatchBusy()) {
      return res.status(409).json({
        success: false,
        message: 'Dispatch is in progress'
      });
    }

    try {
      const epc = String(
        req.body?.epc || ''
      ).trim().toUpperCase();

      const plant = req.body?.plant;

      if (plant !== 'PK') {
        return res.status(400).json({
          success: false,
          message: 'Invalid plant'
        });
      }

      if (!/^[A-F0-9]{8,64}$/.test(epc)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid EPC format'
        });
      }

      // Verify the actual roll registration
      const roll = db.prepare(`
        SELECT epc, serial, model_code,
               lot_no, length_m, weight_kg,
               status, ship_id
        FROM rolls
        WHERE epc = ?
      `).get(epc);

      if (!roll) {
        return res.status(404).json({
          success: false,
          message: 'RFID tag not registered'
        });
      }

      if (
        roll.status !== 'REGISTERED' ||
        String(roll.ship_id || '').trim() !== ''
      ) {
        return res.status(409).json({
          success: false,
          message: 'Roll not eligible for dispatch'
        });
      }

      // Prevent repeated scans of same EPC
      if (scannedBatch.has(epc)) {
        return res.json({
          success: true,
          duplicate: true,
          message: 'RFID already scanned',
          count: scannedBatch.size
        });
      }

      if (scannedBatch.size >= 500) {
        return res.status(409).json({
          success: false,
          message: 'Scan batch is full'
        });
      }

      const scannedRoll = {
        ...roll,
        scannedAt: new Date().toISOString(),
        rssi: Number.isInteger(req.body?.rssi) &&
          req.body.rssi >= -128 &&
          req.body.rssi <= 127
            ? req.body.rssi
            : null,
        scanSource: 'READER_API_TEST'
      };

      scannedBatch.set(epc, scannedRoll);

      console.log('[RFID INGEST]', epc);

      return res.json({
        success: true,
        duplicate: false,
        message: 'RFID reader scan accepted',
        roll: scannedRoll,
        count: scannedBatch.size
      });

    } catch (error) {
      console.error('[RFID INGEST ERROR]', error);

      return res.status(500).json({
        success: false,
        message: 'RFID ingestion failed'
      });
    }
  });
}

module.exports = {
  registerReaderIngest
};
