// server/routes/freshnessRoutes.js
import express from "express";
import { generateRecrawlQueue } from "../services/recrawlPlanner.js";

const router = express.Router();

/**
 * GET /api/freshness
 * Returns the prioritized recrawl queue.
 * Optional query parameter: ?limit=50
 */
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const queue = await generateRecrawlQueue(limit);
    
    res.status(200).json({
      success: true,
      count: queue.length,
      queue,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Freshness API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
