
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());

// ========================================
// STATION ROUTES
// ========================================

// Station 0 - RFID Registration
const station0Routes = require("./station/station0/routes");
app.use("/api/station0", station0Routes);

//station 1- storage
const station1Routes = require("./station/station1/routes");
app.use("/api/station1", station1Routes);
// Station 2 - RFID Dispatch
const station2Routes = require("./station/station2/routes");
app.use("/api/station2", station2Routes);

// Station 1, 3, 4, 5 will be added later.

// ========================================
// MAIN BACKEND STATUS
// ========================================
app.get("/api/status", (req, res) => {
  res.json({
    system: "SUGIHARA RollFlow",
    status: "ONLINE",
    backend: "Node.js + Express",
    database: "PostgreSQL"
  });
});

// ========================================
// POSTGRESQL CONNECTION TEST
// ========================================
app.get("/api/database/test", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        NOW() AS server_time,
        current_database() AS database_name
    `);

    res.json({
      status: "CONNECTED",
      database: result.rows[0].database_name,
      server_time: result.rows[0].server_time
    });

  } catch (error) {
    console.error("[DATABASE ERROR]", error.message);

    res.status(500).json({
      status: "DISCONNECTED",
      message: "Database connection failed"
    });
  }
});

// ========================================
// START MAIN BACKEND
// ========================================
app.listen(PORT, () => {
  console.log("================================");
  console.log("SUGIHARA ROLLFLOW BACKEND");
  console.log(`Server: http://localhost:${PORT}`);
  console.log("Station 0: RFID Registration");
  console.log("Station 2: RFID Dispatch");
  console.log("Database: PostgreSQL");
  console.log("================================");
});
