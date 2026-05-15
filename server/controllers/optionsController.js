import Option from "../models/Option.js";
import mongoose from "mongoose";

// Save options
export const saveOptions = async (req, res) => {
  try {
    const { title, inputs, options } = req.body;

    if (!options || !options.length) {
      return res.status(400).json({
        error: "No options provided"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ error: "Invalid user authentication token." });
    }

    const saved = await Option.create({
      userId: new mongoose.Types.ObjectId(req.user.id),
      title: title || "My Web Options",
      inputs: inputs || {},
      options
    });

    res.json({
      message: "Options saved successfully",
      id: saved._id
    });
  } catch (err) {
    console.error("Save options error:", err);
    res.status(500).json({
      error: err.message
    });
  }
};

// Get all saved lists of current user
export const getMyOptions = async (req, res) => {
  try {
    const lists = await Option.find({
      userId: req.user.id
    })
      .select("title createdAt options")
      .sort({ createdAt: -1 });

    const formatted = lists.map((item) => ({
      _id: item._id,
      title: item.title,
      createdAt: item.createdAt,
      optionCount: item.options.length
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

// Get single saved list by ID
export const getOptionById = async (req, res) => {
  try {
    const option = await Option.findById(req.params.id);

    if (!option) {
      return res.status(404).json({
        error: "Options not found"
      });
    }

    res.json(option);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

// Delete saved list
export const deleteOption = async (req, res) => {
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
      message: "Deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};