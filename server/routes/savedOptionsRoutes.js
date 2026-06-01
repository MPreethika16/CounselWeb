import express from "express";
import SavedOption from "../models/SavedOption.js";
import College from "../models/College.js";
import mongoose from "mongoose";
import verifyToken from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/saved-options
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, inputs, options } = req.body;

    if (!Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: "No options provided" });
    }

    const userIdStr = req.user?.id || req.user?._id;
    if (!userIdStr) {
      return res.status(401).json({ error: "User identity key not found in authorization token." });
    }

    const newSavedOption = new SavedOption({
      userId: userIdStr,
      title: title || "Saved Web Options",
      inputs: inputs || {},
      options
    });

    await newSavedOption.save();

    res.json({
      success: true,
      message: "Options saved successfully",
      id: newSavedOption._id
    });
  } catch (err) {
    console.error("Save options error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/saved-options
router.get("/", verifyToken, async (req, res) => {
  try {
    const userIdStr = req.user?.id || req.user?._id;
    if (!userIdStr) {
      return res.status(401).json({ error: "User identity key not found in authorization token." });
    }

    const data = await SavedOption.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userIdStr) } },
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
    console.error("Get saved options error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/saved-options/:id
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const userIdStr = req.user?.id || req.user?._id;
    if (!userIdStr) {
      return res.status(401).json({ error: "User identity key not found in authorization token." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const option = await SavedOption.findById(req.params.id);

    if (!option) {
      return res.status(404).json({ error: "Options not found" });
    }

    if (option.userId.toString() !== userIdStr) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const optionObj = option.toObject();
    const enrichedOptions = [];

    for (const entry of optionObj.options) {
      const query = {
        collegeCode: entry.collegeCode,
        branchCode: entry.branchCode
      };

      if (optionObj.inputs?.category && optionObj.inputs?.gender) {
        query.category = optionObj.inputs.category;
        query.gender = optionObj.inputs.gender;
      }

      let collegeDetails = await College.findOne(query);
      if (!collegeDetails) {
        collegeDetails = await College.findOne({
          collegeCode: entry.collegeCode,
          branchCode: entry.branchCode
        });
      }

      if (collegeDetails) {
        enrichedOptions.push({
          ...entry,
          name: entry.name || collegeDetails.name,
          branch: entry.branch || collegeDetails.branch,
          district: entry.district || collegeDetails.district,
          place: entry.place || collegeDetails.place,
          cutoff: entry.cutoff !== undefined ? entry.cutoff : collegeDetails.cutoff,
          fees: entry.fees !== undefined ? entry.fees : collegeDetails.fees,
          score: entry.score !== undefined ? entry.score : 100
        });
      } else {
        enrichedOptions.push(entry);
      }
    }

    optionObj.options = enrichedOptions;
    res.json(optionObj);
  } catch (err) {
    console.error("Get saved option by id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/saved-options/:id
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userIdStr = req.user?.id || req.user?._id;
    if (!userIdStr) {
      return res.status(401).json({ error: "User identity key not found in authorization token." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const option = await SavedOption.findById(req.params.id);

    if (!option) {
      return res.status(404).json({ error: "Options not found" });
    }

    if (option.userId.toString() !== userIdStr) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await option.deleteOne();

    res.json({
      success: true,
      message: "Deleted successfully"
    });
  } catch (err) {
    console.error("Delete saved option error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
