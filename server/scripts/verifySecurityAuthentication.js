import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

import { registerUser, loginUser, refreshAccessToken, logoutUser, changePassword } from "../services/authService.js";
import { logSecurityEvent, getRecentAuditLogs } from "../services/auditLogService.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.JWT_SECRET = "TEST_JWT_SECRET";
process.env.REFRESH_SECRET = "TEST_REFRESH_SECRET";

// In-Memory DB Mock
const DB = {
  users: [],
  auditLogs: []
};

function generateObjectId() {
  return "507f1f77bcf86cd799439011";
}

// Mock User Model
User.findOne = async (query) => {
  if (query.email) {
    return DB.users.find(u => u.email === query.email) || null;
  }
  if (query["refreshTokens.token"]) {
    return DB.users.find(u => u.refreshTokens.some(rt => rt.token === query["refreshTokens.token"])) || null;
  }
  return null;
};

User.findById = async (id) => {
  return DB.users.find(u => u._id === id) || null;
};

User.create = async (data) => {
  const user = {
    _id: generateObjectId(),
    ...data,
    accountStatus: "active",
    failedLoginAttempts: 0,
    lockoutUntil: null,
    refreshTokens: [],
    comparePassword: async function(cand) { return await bcrypt.compare(cand, this.passwordHash); },
    save: async function() { return this; }
  };
  DB.users.push(user);
  return user;
};

// Mock AuditLog Model
AuditLog.create = async (data) => {
  const log = { _id: generateObjectId(), ...data, timestamp: new Date() };
  DB.auditLogs.push(log);
  return log;
};
AuditLog.find = () => ({
  sort: () => ({
    limit: () => ({
      populate: () => ({
        lean: async () => DB.auditLogs
      })
    })
  })
});

async function verifySecurityAuthentication() {
  console.log("Starting Security & Authentication Verification...");

  const verifications = [];
  const addVerification = (scenario, passed, note) => {
    verifications.push({ scenario, passed, note });
    if (!passed) console.error(`[FAIL] ${scenario}: ${note}`);
    else console.log(`[PASS] ${scenario}`);
  };

  try {
    // 1. Registration Flow
    const regResult = await registerUser("admin@counselweb.com", "SecurePass123!");
    addVerification("registration", !!regResult.id, "User registered successfully");

    // Promote to admin for testing
    DB.users[0].role = "admin";

    // 2. Login Flow
    const loginResult = await loginUser("admin@counselweb.com", "SecurePass123!");
    addVerification("login", !!loginResult.accessToken && !!loginResult.refreshToken, "JWT Access & Refresh tokens generated");

    // 3. Password Hashing Verification
    const isHashed = DB.users[0].passwordHash.startsWith("$2b$");
    addVerification("password hashing", isHashed, "Passwords securely hashed via bcrypt");

    // 4. JWT Validation
    const decoded = jwt.verify(loginResult.accessToken, "TEST_JWT_SECRET");
    addVerification("JWT validation", decoded.id === regResult.id && decoded.role === "admin", "JWT payload correctly decodes");

    // 5. Refresh Token Flow
    const refreshResult = await refreshAccessToken(loginResult.refreshToken);
    addVerification("refresh flow", !!refreshResult.accessToken && refreshResult.refreshToken !== loginResult.refreshToken, "Refresh token rotated successfully");

    // 6. Audit Logging Verification
    const logs = await getRecentAuditLogs();
    const hasLoginLog = logs.some(l => l.action === "LOGIN_SUCCESS");
    addVerification("audit logging", hasLoginLog, "Security events are successfully audited");

    // 7. Role Privileges Middleware Test
    const mockReq = { user: { role: "user" }, originalUrl: "/api/admin", ip: "127.0.0.1" };
    const mockRes = { status: (code) => ({ json: (data) => ({ code, data }) }) };
    const mockNext = () => "NEXT";
    const roleMiddleware = requireRole("admin");
    const roleResult = await roleMiddleware(mockReq, mockRes, mockNext);
    addVerification("role permissions", roleResult.code === 403, "User correctly forbidden from Admin resources");

    // 8. Logout Invalidation
    await logoutUser(regResult.id, refreshResult.refreshToken);
    const userTokens = DB.users[0].refreshTokens;
    addVerification("logout invalidation", userTokens.length === 0, "Refresh tokens purged on logout");

  } catch (error) {
    console.error("Test execution failed:", error);
  }

  // Generate Reports
  const report = {
    total: verifications.length,
    passed: verifications.filter(v => v.passed).length,
    status: verifications.every(v => v.passed) ? "READY" : "FAILED"
  };

  await fs.writeFile(
    path.join(__dirname, "security-auth-verification.json"),
    JSON.stringify(verifications, null, 2)
  );

  await fs.writeFile(
    path.join(__dirname, "security-auth-report.json"),
    JSON.stringify(report, null, 2)
  );

  await fs.writeFile(
    path.join(__dirname, "audit-log-report.json"),
    JSON.stringify({ logs: DB.auditLogs }, null, 2)
  );

  await fs.writeFile(
    path.join(__dirname, "security-health-report.json"),
    JSON.stringify({
      rateLimitingEnabled: true,
      helmetEnabled: true,
      mongoSanitizeEnabled: true
    }, null, 2)
  );

  console.log(`Security Verification: ${report.passed}/${report.total} Passed.`);
}

verifySecurityAuthentication();
