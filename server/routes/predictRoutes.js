import express from "express";
import { predictColleges } from "../controllers/predictController.js";

const router = express.Router();

router.post("/", predictColleges);

export default router;