import express from "express";
import Option from "../models/Option.js";
import mongoose from "mongoose";

const router = express.Router();

/*
========================================
🔐 SAVE OPTIONS (NOW PUBLIC)
POST /api/options/save
========================================
*/
router.post("/save", async (req, res) => {
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

    const newOption = new Option({
      // No userId required for public saves
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
👤 GET ALL SAVED OPTIONS (PUBLIC MODE)
GET /api/options/my
========================================
*/
router.get("/my", async (req, res) => {
  try {
    // In public mode, we just return the most recent public options
    // or we could filter by IP (complex). For now, let's return all public ones.
    const data = await Option.aggregate([
      { $match: { userId: { $exists: false } } }, // Only show anonymous saves
      { 
        $project: {
          title: 1,
          inputs: 1,
          createdAt: 1,
          optionCount: { $size: { $ifNull: ["$options", []] } }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 20 } // Limit to 20 for public dashboard
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
✏️ UPDATE TITLE (PUBLIC)
PUT /api/options/:id
========================================
*/
router.put("/:id", async (req, res) => {
  try {
    const { title } = req.body;

    const option = await Option.findById(req.params.id);

    if (!option) {
      return res.status(404).json({
        error: "Options not found"
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
🗑️ DELETE SAVED OPTIONS (PUBLIC)
DELETE /api/options/:id
========================================
*/
router.delete("/:id", async (req, res) => {
  try {
    const option = await Option.findById(req.params.id);

    if (!option) {
      return res.status(404).json({
        error: "Options not found"
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