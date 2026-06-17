import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "TEST_JWT_SECRET";

/**
 * Validates the JWT Access Token in the Authorization header.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired", expired: true });
      }
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = user; // { id, role, iat, exp }
    next();
  });
}