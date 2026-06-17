// server/routes/scraperOrchestrationRoutes.js
import express from "express";
import { runOrchestration, getMetrics } from "../services/scraperOrchestratorService.js";

const router = express.Router();

/**
 * GET /api/orchestration/status
 * Returns overall orchestration status and metrics
 */
router.get("/status", async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Orchestration Status Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/orchestration/run
 * Manually triggers the orchestration cycle
 */
router.post("/run", async (req, res) => {
  try {
    const maxWorkers = parseInt(req.body.maxWorkers, 10) || 5;
    const result = await runOrchestration({ maxWorkers });
    
    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(409).json({ success: false, message: result.message }); // 409 Conflict if locked
    }
  } catch (err) {
    console.error("Orchestration Run Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
