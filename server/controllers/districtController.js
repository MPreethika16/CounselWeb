import College from "../models/College.js";

export const getDistricts = async (req, res) => {
  try {
    const count2025 = await College.countDocuments({ year: 2025 });
    console.log(`[District Debug] Count of 2025 colleges in DB: ${count2025}`);

    let districts;
    if (count2025 > 0) {
      districts = await College.distinct("district", { year: 2025 });
      console.log(`[District Debug] Fetched distinct districts for year 2025. Count: ${districts.length}`);
    } else {
      districts = await College.distinct("district");
      console.log(`[District Debug] No 2025 data found. Fell back to all distinct districts. Count: ${districts.length}`);
    }

    console.log("[District Debug] Raw districts from DB:", districts);

    const clean = districts
      .filter(d => d && d.trim() !== "")
      .map(d => d.toUpperCase())
      .sort();

    console.log("[District Debug] Cleaned and sorted districts to return:", clean);

    res.json({ districts: clean });

  } catch (err) {
    console.error("[District Debug] Error in getDistricts:", err);
    res.status(500).json({ error: err.message });
  }
};

