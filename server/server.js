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

dotenv.config();

const app = express();

// Connect DB
connectDB();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use("/api/auth", authRoutes);

app.use("/api/options", optionRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/predict", predictRoutes);
app.use("/api/web-options", webOptionsRoutes);
app.use("/api/institution", institutionRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});