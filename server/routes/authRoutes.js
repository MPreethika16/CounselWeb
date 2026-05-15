import express from "express";
import { signup, login, getMe, updateProfile, googleAuth } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);
router.post("/google", googleAuth);

export default router;