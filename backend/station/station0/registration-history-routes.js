// Station 0 history always shows registered rolls, including later transfers.
// Auth middleware supplied by station0/routes.js.
function registerHistoryRoutes(router, pool, verifyToken) {
  router.get("/registrations", verifyToken, async (req, res) => {
    const rawLimit = Number(req.query.limit ?? 100);
    const limit = Number.isInteger(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, 100) : 100;
    try {
      const [result, countResult] = await Promise.all([
        pool.query(`
          SELECT roll_id, epc, model_code, lot_no, length_m,
                 date_of_birth::text AS date_of_birth,
                 storage_location, registered_at,
                 to_char(registered_at AT TIME ZONE 'Asia/Kuala_Lumpur',
                         'YYYY-MM-DD HH24:MI:SS') AS registered_at_myt,
                 current_station, status
          FROM rolls
          WHERE roll_id IS NOT NULL
          ORDER BY roll_id DESC
          LIMIT $1
        `, [limit]),
        pool.query(`SELECT COUNT(*)::int AS total FROM rolls WHERE roll_id IS NOT NULL`)
      ]);
      return res.json({ success: true, rolls: result.rows, total: countResult.rows[0].total });
    } catch (error) {
      console.error('[STATION 0 HISTORY]', error);
      return res.status(500).json({ success: false, message: 'Could not load registration history' });
    }
  });
}
module.exports = { registerHistoryRoutes };
