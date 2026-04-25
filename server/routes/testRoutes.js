import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/test", authMiddleware, (req, res) => {
  res.json({
    message: "Access granted",
    user: req.user
  });
});

export default router;

//"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWJiNDNkMDRjYjA2NzhiYjRiODBiNyIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzc3MTA2ODkxLCJleHAiOjE3Nzc3MTE2OTF9.Ex4mEkObdw9zv9ZUe5zUvjPlt53thdMXhckHJoVEncU"
//"id": "69ec877d297052597b48bb7f"