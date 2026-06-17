import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/User.js";
import { logSecurityEvent } from "./auditLogService.js";

// Uses process.env fallback to TEST variables for testing suites
const JWT_SECRET = process.env.JWT_SECRET || "TEST_JWT_SECRET";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "TEST_REFRESH_SECRET";
const JWT_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN_DAYS = 7;

export async function registerUser(email, password, ip = "") {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Enforce basic password strength
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    email,
    passwordHash,
    role: "user"
  });

  await logSecurityEvent(newUser._id, "REGISTER_USER", { email }, ip);
  return { id: newUser._id, email: newUser.email, role: newUser.role };
}

export async function loginUser(email, password, ip = "") {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    await logSecurityEvent(null, "LOGIN_FAILED_NOT_FOUND", { email }, ip);
    throw new Error("Invalid credentials");
  }

  if (user.accountStatus === "locked") {
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      await logSecurityEvent(user._id, "LOGIN_ATTEMPT_LOCKED", {}, ip);
      throw new Error("Account is temporarily locked. Please try again later.");
    } else {
      // Unlock account if lockout time has passed
      user.accountStatus = "active";
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
    }
  }

  if (user.accountStatus === "suspended") {
    throw new Error("Account is suspended. Please contact support.");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.accountStatus = "locked";
      user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      await logSecurityEvent(user._id, "ACCOUNT_LOCKED", {}, ip);
    }
    await user.save();
    await logSecurityEvent(user._id, "LOGIN_FAILED_INVALID_PASSWORD", {}, ip);
    throw new Error("Invalid credentials");
  }

  // Successful Login
  user.failedLoginAttempts = 0;
  user.accountStatus = "active";
  user.lockoutUntil = null;
  user.lastLoginAt = new Date();

  // Generate Tokens
  const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = crypto.randomBytes(40).toString("hex");

  const refreshExpiry = new Date(Date.now() + REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
  
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: refreshExpiry,
    ip
  });

  // Keep array small
  if (user.refreshTokens.length > 5) {
    user.refreshTokens.shift();
  }

  await user.save();
  await logSecurityEvent(user._id, "LOGIN_SUCCESS", {}, ip);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      role: user.role
    }
  };
}

export async function refreshAccessToken(refreshToken, ip = "") {
  const user = await User.findOne({ "refreshTokens.token": refreshToken });
  if (!user) {
    throw new Error("Invalid refresh token");
  }

  const tokenDoc = user.refreshTokens.find(rt => rt.token === refreshToken);
  
  if (!tokenDoc || new Date() > tokenDoc.expiresAt) {
    // Revoke token if expired
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    await user.save();
    throw new Error("Refresh token expired");
  }

  // Token Rotation
  user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
  
  const newAccessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const newRefreshToken = crypto.randomBytes(40).toString("hex");
  
  user.refreshTokens.push({
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000),
    ip
  });

  await user.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}

export async function logoutUser(userId, refreshToken) {
  const user = await User.findById(userId);
  if (!user) return;

  if (refreshToken) {
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
  } else {
    // Logout all sessions
    user.refreshTokens = [];
  }
  
  await user.save();
  await logSecurityEvent(userId, "LOGOUT", {});
}

export async function changePassword(userId, oldPassword, newPassword, ip = "") {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    await logSecurityEvent(userId, "PASSWORD_CHANGE_FAILED", {}, ip);
    throw new Error("Incorrect current password");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  const salt = await bcrypt.genSalt(12);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  
  // Invalidate all existing sessions
  user.refreshTokens = [];
  
  await user.save();
  await logSecurityEvent(userId, "PASSWORD_CHANGED", {}, ip);
}
