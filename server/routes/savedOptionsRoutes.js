import express from "express";
import Option from "../models/Option.js";
import mongoose from "mongoose";
import verifyToken from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/saved-options
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, inputs, options } = req.body;

    if (!options || options.length === 0) {
      return res.status(400).json({ error: "No options provided" });
    }

    const newOption = new Option({
      userId: new mongoose.Types.ObjectId(req.user.id),
      title: title || "Saved Web Options",
      inputs: inputs || {},
      options
    });

    await newOption.save();

    res.json({
      success: true,
      message: "Options saved successfully",
      id: newOption._id
    });
  } catch (err) {
    console.error("Save options error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/saved-options
router.get("/", verifyToken, async (req, res) => {
  try {
    const data = await Option.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $project: {
          title: 1,
          inputs: 1,
          createdAt: 1,
          optionCount: { $size: { $ifNull: ["$options", []] } }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    const formatted = data.map((item) => ({
      _id: item._id,
      title: item.title,
      createdAt: item.createdAt,
      optionCount: item.optionCount,
      inputs: item.inputs
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/saved-options/:id
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const option = await Option.findById(req.params.id);

    if (!option) {
      return res.status(404).json({ error: "Options not found" });
    }

    if (option.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await option.deleteOne();

    res.json({
      success: true,
      message: "Deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
