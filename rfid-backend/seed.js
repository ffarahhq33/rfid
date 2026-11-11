
const db = require('./database');

const rolls = [
  {
    epc: 'E20000112233445566778801',
    serial: 'ROLL-001',
    model: 'D27A',
    lot: 'LOT-001',
    length: 50,
    weight: 25
  },
  {
    epc: 'E20000112233445566778802',
    serial: 'ROLL-002',
    model: 'D27A',
    lot: 'LOT-001',
    length: 48,
    weight: 24
  },
  {
    epc: 'E20000112233445566778803',
    serial: 'ROLL-003',
    model: 'D38L',
    lot: 'LOT-002',
    length: 55,
    weight: 27
  }
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO rolls (
    epc,
    serial,
    model_code,
    lot_no,
    length_m,
    weight_kg,
    produced_at,
    status,
    ship_id
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
`);

const seed = db.transaction(() => {
  for (const roll of rolls) {
    insert.run(
      roll.epc,
      roll.serial,
      roll.model,
      roll.lot,
      roll.length,
      roll.weight,
      new Date().toISOString(),
      'REGISTERED'
    );
  }
});

seed();

console.log('Sample RFID roll data inserted!');
console.log('Total rolls:', db.prepare(
  'SELECT COUNT(*) AS total FROM rolls'
).get().total);

db.close();
