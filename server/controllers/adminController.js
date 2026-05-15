import User from "../models/User.js";
import College from "../models/College.js";
import Option from "../models/Option.js";

export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalInstitutions = await User.countDocuments({ role: "institution" });
    const totalAdmins = await User.countDocuments({ role: "admin" });

    const totalCollegeRows = await College.countDocuments();

    const uniqueColleges = await College.distinct("collegeCode");

    const totalSavedOptions = await Option.countDocuments();

    res.json({
      totalUsers,
      totalStudents,
      totalInstitutions,
      totalAdmins,
      totalCollegeRows,
      totalUniqueColleges: uniqueColleges.length,
      totalSavedOptions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("collegeId", "name collegeCode")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllColleges = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { collegeCode: { $regex: search, $options: "i" } },
        { district: { $regex: search, $options: "i" } },
        { place: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const colleges = await College.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$collegeCode",
          collegeCode: { $first: "$collegeCode" },
          name: { $first: "$name" },
          place: { $first: "$place" },
          district: { $first: "$district" },
          affiliated: { $first: "$affiliated" },
          fees: { $first: "$fees" },
          placements: { $first: "$placements" },
          facilities: { $first: "$facilities" },
          ranking: { $first: "$ranking" }
        }
      },
      { $sort: { name: 1 } },
      { $skip: skip },
      { $limit: Number(limit) }
    ]);

    const uniqueCodes = await College.distinct("collegeCode", query);

    res.json({
      colleges,
      page: Number(page),
      limit: Number(limit),
      total: uniqueCodes.length,
      pages: Math.ceil(uniqueCodes.length / Number(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCollegeByAdmin = async (req, res) => {
  try {
    const { collegeCode } = req.params;

    const updated = await College.updateMany(
      { collegeCode: collegeCode.toUpperCase() },
      { $set: req.body }
    );

    res.json({
      message: "College updated successfully",
      matchedCount: updated.matchedCount,
      modifiedCount: updated.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const assignCollegeToInstitution = async (req, res) => {
  try {
    const { userId, collegeId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        role: "institution",
        collegeId
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Institution assigned successfully",
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const deleted = await User.findByIdAndDelete(userId);

    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};