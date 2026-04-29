import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { isInstitution } from "../middleware/roleMiddleware.js";
import College from "../models/College.js";

const router = express.Router();

// Get institution's own college
router.get("/my-college", authMiddleware, isInstitution, async (req, res) => {
  try {
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
    const updatedCollege = await College.findByIdAndUpdate(
      req.user.collegeId,
      req.body,
      { new: true }
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

export default router;