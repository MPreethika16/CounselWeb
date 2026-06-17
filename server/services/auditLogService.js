import AuditLog from "../models/AuditLog.js";

/**
 * Service to manage and persist security and system events.
 */
export async function logSecurityEvent(userId, action, metadata = {}, ip = "") {
  try {
    await AuditLog.create({
      userId: userId || null,
      action,
      ip,
      metadata
    });
  } catch (error) {
    console.error("[AUDIT LOG ERROR] Failed to record event:", error.message);
  }
}

/**
 * Retrieve recent logs for admin dashboard
 */
export async function getRecentAuditLogs(limit = 100) {
  return await AuditLog.find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("userId", "email role")
    .lean();
}
