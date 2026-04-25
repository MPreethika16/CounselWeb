import mongoose from "mongoose";
import dotenv from "dotenv";
import College from "../models/College.js";
import colleges from "../data/colleges.json" assert { type: "json" };

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await College.deleteMany();

    await College.insertMany(colleges);

    console.log("Colleges inserted ✅");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedData();