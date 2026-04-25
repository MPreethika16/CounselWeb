import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import optionRoutes from "./routes/options.js";
import collegeRoutes from "./routes/collegeRoutes.js";
import predictRoutes from "./routes/predictRoutes.js";


dotenv.config();

const app = express();

// Connect DB
connectDB();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/options", optionRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/predict", predictRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});