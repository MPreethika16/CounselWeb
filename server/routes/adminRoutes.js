import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";

import {
  getAdminStats,
  getAllUsers,
  getAllColleges,
  updateCollegeByAdmin,
  assignCollegeToInstitution,
  deleteUserByAdmin
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/stats", authMiddleware, isAdmin, getAdminStats);

router.get("/users", authMiddleware, isAdmin, getAllUsers);

router.delete("/users/:userId", authMiddleware, isAdmin, deleteUserByAdmin);

router.get("/colleges", authMiddleware, isAdmin, getAllColleges);

router.put(
  "/colleges/:collegeCode",
  authMiddleware,
  isAdmin,
  updateCollegeByAdmin
);

router.post(
  "/assign-institution",
  authMiddleware,
  isAdmin,
  assignCollegeToInstitution
);

export default router;