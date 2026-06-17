import { logSecurityEvent } from "../services/auditLogService.js";

/**
 * Checks if the authenticated user has the required role.
 * Must be used after authenticateToken.
 */
export function requireRole(role) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.user.role !== role) {
      await logSecurityEvent(req.user.id, "RBAC_VIOLATION", { path: req.originalUrl, requiredRole: role, actualRole: req.user.role }, req.ip);
      return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
    }

    next();
  };
}