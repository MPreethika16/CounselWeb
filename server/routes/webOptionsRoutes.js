import express from "express";
import { generateWebOptions } from "../controllers/webOptionsController.js";

const router = express.Router();

router.post("/", generateWebOptions);

export default router;