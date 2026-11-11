
const pool = require("../../config/db");

// PostgreSQL connection shared across stations
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result;
}

module.exports = {
  pool,
  query
};
