import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { isInstitution } from "../middleware/roleMiddleware.js";
import College from "../models/College.js";

const router = express.Router();

// Get institution's own college
router.get("/my-college", authMiddleware, isInstitution, async (req, res) => {
  try {
    if (!req.user.collegeId) {
      return res.status(400).json({
        message: "No college linked to this institution account"
      });
    }

    const college = await College.findById(req.user.collegeId);

    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

    res.json(college);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update institution's own college
router.put("/my-college", authMiddleware, isInstitution, async (req, res) => {
  try {
    if (!req.user.collegeId) {
      return res.status(400).json({
        message: "No college linked to this institution account"
      });
    }

    const allowedUpdates = {
      fees: req.body.fees,
      placements: req.body.placements,
      facilities: req.body.facilities,
      ranking: req.body.ranking
    };

    Object.keys(allowedUpdates).forEach((key) => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    const updatedCollege = await College.findByIdAndUpdate(
      req.user.collegeId,
      { $set: allowedUpdates },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedCollege) {
      return res.status(404).json({ message: "College not found" });
    }

    res.json({
      message: "College updated successfully",
      college: updatedCollege
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Link account to a college
router.post("/link", authMiddleware, isInstitution, async (req, res) => {
  try {
    const { collegeId } = req.body;
    if (!collegeId) return res.status(400).json({ message: "College ID required" });

    // Verify college exists
    const college = await College.findById(collegeId);
    if (!college) return res.status(404).json({ message: "College not found" });

    // Update User
    const User = (await import("../models/User.js")).default;
    await User.findByIdAndUpdate(req.user.id, { collegeId });

    res.json({ message: "College linked successfully", college });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;