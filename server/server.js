import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

import optionRoutes from "./routes/optionsRoutes.js";
import collegeRoutes from "./routes/collegeRoutes.js";
import predictRoutes from "./routes/predictRoutes.js";
import webOptionsRoutes from "./routes/webOptionsRoutes.js";
import institutionRoutes from "./routes/institutionRoutes.js";
import compareRoutes from "./routes/compareRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import savedOptionsRoutes from "./routes/savedOptionsRoutes.js";
import districtRoutes from "./routes/districtRoutes.js";

dotenv.config();

const app = express();

// Connect DB
connectDB();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "CounselWise API is running"
  });
});

app.use("/api", districtRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/options", optionRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/predictor", predictRoutes);
app.use("/api/web-options", webOptionsRoutes);
app.use("/api/institution", institutionRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/saved-options", savedOptionsRoutes);


app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});