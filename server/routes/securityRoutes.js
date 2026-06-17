import express from "express";
import { getRecentAuditLogs } from "../services/auditLogService.js";
import { getSystemHealth } from "../services/optimizationService.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Require valid session and ADMIN role for all security routes
router.use(authenticateToken);
router.use(requireRole("admin"));

router.get("/audit-logs", async (req, res) => {
  try {
    const logs = await getRecentAuditLogs(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.get("/health", (req, res) => {
  try {
    const health = getSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch health metrics" });
  }
});

export default router;
