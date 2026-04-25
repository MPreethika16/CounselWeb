import express from "express";
import Option from "../models/Option.js";
import authMiddleware from "../middleware/authMiddleware.js"; // JWT middleware

const router = express.Router();

/*
========================================
🔐 SAVE OPTIONS (PROTECTED)
========================================
*/
router.post("/save", authMiddleware, async (req, res) => {
  try {
    const { options } = req.body;

    if (!options || options.length === 0) {
      return res.status(400).json({ error: "No options provided" });
    }

    const newOption = new Option({
      userId: req.user.id,   // 🔥 from JWT
      options
    });

    await newOption.save();

    res.json({
      success: true,
      message: "Options saved successfully",
      id: newOption._id
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/*
========================================
🔗 GET OPTIONS BY ID (SHARE LINK)
========================================
*/
router.get("/:id", async (req, res) => {
  try {
    const data = await Option.findById(req.params.id);

    if (!data) {
      return res.status(404).json({ error: "Options not found" });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/*
========================================
👤 GET ALL SAVED OPTIONS OF USER
========================================
*/
router.get("/user/my-options", authMiddleware, async (req, res) => {
  try {
    const data = await Option.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/*
========================================
🗑️ DELETE SAVED OPTIONS
========================================
*/
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const option = await Option.findById(req.params.id);

    if (!option) {
      return res.status(404).json({ error: "Not found" });
    }

    // 🔐 only owner can delete
    if (option.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await option.deleteOne();

    res.json({ success: true, message: "Deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;