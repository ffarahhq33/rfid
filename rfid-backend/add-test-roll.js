const db = require('./database');

const epc = 'E20000112233445566778804';

const existing = db.prepare(
  'SELECT epc, status FROM rolls WHERE epc = ?'
).get(epc);

if (existing) {
  console.log('Roll already exists:', existing);
} else {
  db.prepare(`
    INSERT INTO rolls
    (epc, serial, model_code, lot_no,
     length_m, weight_kg, status, ship_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    epc,
    'ROLL-004',
    'D27A',
    'LOT-TEST-004',
    50,
    25,
    'REGISTERED',
    null
  );

  console.log('Test roll registered:', epc);
}
