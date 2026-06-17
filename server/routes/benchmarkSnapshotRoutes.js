// server/routes/benchmarkSnapshotRoutes.js
import express from "express";
import BenchmarkSnapshot from "../models/BenchmarkSnapshot.js";
import { calculateSnapshotChanges } from "../services/benchmarkSnapshotService.js";

const router = express.Router();

/**
 * GET /api/benchmark-snapshots
 * Pulls historical time-series bounds actively mapping dynamic variables efficiently.
 * Query: ?scraperName=NAME
 */
router.get("/", async (req, res) => {
  try {
    const { scraperName } = req.query;
    
    if (!scraperName) {
      return res.status(400).json({ success: false, error: "scraperName is required" });
    }

    // Pull all snapshots for this scraper natively
    const snapshots = await BenchmarkSnapshot.find({ scraperName })
      .sort({ snapshotDate: -1 }) // newest first
      .lean();

    if (snapshots.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          scraperName,
          snapshotDate: null,
          current: null,
          changes: { from7d: null, from30d: null }
        },
        generatedAt: new Date().toISOString()
      });
    }

    const latest = snapshots[0];

    // Find the closest snapshot to 7 days ago natively
    const target7d = new Date(latest.snapshotDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    // Find the closest snapshot to 30 days ago natively
    const target30d = new Date(latest.snapshotDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    let history7d = null;
    let history30d = null;

    // A simple heuristic: find the snapshot that is exactly at or *older* than target bounds
    // Because they are sorted descending, we scan backwards.
    for (const snap of snapshots) {
      if (!history7d && snap.snapshotDate <= target7d && snap.snapshotDate > target30d) {
        history7d = snap;
      }
      if (!history30d && snap.snapshotDate <= target30d) {
        history30d = snap;
      }
    }

    const payload = calculateSnapshotChanges(latest, history7d, history30d);

    res.status(200).json({
      success: true,
      data: payload,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Benchmark Snapshot API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
