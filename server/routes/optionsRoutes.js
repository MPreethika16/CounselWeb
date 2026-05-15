import express from "express";
import Option from "../models/Option.js";
import authMiddleware from "../middleware/authMiddleware.js";
import mongoose from "mongoose";

const router = express.Router();

/*
========================================
🔐 SAVE OPTIONS
POST /api/options/save
========================================
*/
router.post("/save", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      inputs,
      options
    } = req.body;

    if (!options || options.length === 0) {
      return res.status(400).json({
        error: "No options provided"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ error: "Invalid user authentication token." });
    }

    const newOption = new Option({
      userId: new mongoose.Types.ObjectId(req.user.id),
      title: title || "My Web Options",
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
    res.status(500).json({
      error: err.message
    });
  }
});

/*
========================================
👤 GET ALL SAVED OPTIONS OF USER
GET /api/options/my
========================================
*/
router.get("/my", authMiddleware, async (req, res) => {
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
    res.status(500).json({
      error: err.message
    });
  }
});

/*
========================================
🔗 GET OPTIONS BY ID (PUBLIC SHARE LINK)
GET /api/options/:id
========================================
*/
router.get("/:id", async (req, res) => {
  try {
    const data = await Option.findById(req.params.id);

    if (!data) {
      return res.status(404).json({
        error: "Options not found"
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

/*
========================================
✏️ UPDATE TITLE
PUT /api/options/:id
========================================
*/
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;

    const option = await Option.findById(req.params.id);

    if (!option) {
      return res.status(404).json({
        error: "Options not found"
      });
    }

    if (option.userId.toString() !== req.user.id) {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    option.title = title || option.title;
    await option.save();

    res.json({
      success: true,
      message: "Title updated successfully",
      option
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

/*
========================================
🗑️ DELETE SAVED OPTIONS
DELETE /api/options/:id
========================================
*/
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const option = await Option.findById(req.params.id);

    if (!option) {
      return res.status(404).json({
        error: "Options not found"
      });
    }

    if (option.userId.toString() !== req.user.id) {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    await option.deleteOne();

    res.json({
      success: true,
      message: "Deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

export default router;