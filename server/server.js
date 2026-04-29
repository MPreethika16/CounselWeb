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


dotenv.config();

const app = express();

// Connect DB
connectDB();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.use("/api/options", optionRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/predict", predictRoutes);
app.use("/api/web-options", webOptionsRoutes);
app.use("/api/institution", institutionRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});