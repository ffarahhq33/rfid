function registerDispatchPreparation(app, scannedBatch) {

  // Read-only dispatch preparation
  // No database writes and no shipment creation
  app.get("/api/station2/dispatch/prepare", (req, res) => {
    const rolls = [...scannedBatch.values()].map(r => ({
      epc: r.epc,
      serial: r.serial,
      model_code: r.model_code,
      lot_no: r.lot_no,
      length_m: r.length_m,
      weight_kg: r.weight_kg,
      scannedAt: r.scannedAt
    }));

    res.json({
      success: true,
      dispatchEnabled: false,
      totalScanned: rolls.length,
      rolls
    });
  });

  console.log("[DISPATCH PREPARATION] Read-only mode ready");
}

module.exports = { registerDispatchPreparation };
