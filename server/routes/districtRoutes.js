import express from "express";
import { getDistricts } from "../controllers/districtController.js";

const router = express.Router();

router.get("/districts", getDistricts);

export default router;
