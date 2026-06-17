import express from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword } from "../services/authService.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const user = await registerUser(email, password, req.ip);
    res.status(201).json({ message: "Registration successful", user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const data = await loginUser(email, password, req.ip);
    res.json(data);
  } catch (error) {
    const statusCode = error.message.includes("locked") || error.message.includes("suspended") ? 403 : 401;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await logoutUser(req.user.id, refreshToken);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

    const data = await refreshAccessToken(refreshToken, req.ip);
    res.json(data);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: "Both old and new passwords are required" });

    await changePassword(req.user.id, oldPassword, newPassword, req.ip);
    res.json({ message: "Password changed successfully. Please log in again." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/profile", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;