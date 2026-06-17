import CollegeMaster from "../models/CollegeMaster.js";

/**
 * Provides fast autocomplete suggestions based on partial user input.
 */
export async function getSuggestions(query, type = 'all', limit = 5) {
  if (!query || query.length < 2) return [];

  // Safe light fuzzy regex
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(safeQuery, 'i');

  const results = [];
  const added = new Set();

  if (type === 'all' || type === 'college') {
    const colleges = await CollegeMaster.find({ name: { $regex: regex } })
      .select("name collegeCode")
      .limit(limit)
      .lean();
      
    for (const c of colleges) {
      if (!added.has(c.name)) {
        results.push({ text: c.name, type: 'college', code: c.collegeCode });
        added.add(c.name);
      }
    }
  }

  if (type === 'all' || type === 'state') {
    const colleges = await CollegeMaster.find({ state: { $regex: regex } })
      .select("state")
      .limit(limit)
      .lean();
      
    for (const c of colleges) {
      if (c.state && !added.has(c.state)) {
        results.push({ text: c.state, type: 'state' });
        added.add(c.state);
      }
    }
  }

  // Extract cities and courses from officialData if needed
  // Note: Deep nested searches without indexes can be slow, but for MVP it's acceptable.
  if (type === 'all' || type === 'course') {
    const colleges = await CollegeMaster.find({
      $or: [
        { "officialData.academics.ugCourses.name": { $regex: regex } },
        { "officialData.academics.pgCourses.name": { $regex: regex } }
      ]
    }).select("officialData.academics.ugCourses.name officialData.academics.pgCourses.name").limit(limit * 2).lean();

    for (const c of colleges) {
      const allCourses = [
        ...(c.officialData?.academics?.ugCourses || []),
        ...(c.officialData?.academics?.pgCourses || [])
      ];
      for (const crs of allCourses) {
        if (crs.name && regex.test(crs.name) && !added.has(crs.name)) {
          results.push({ text: crs.name, type: 'course' });
          added.add(crs.name);
          if (results.filter(r => r.type === 'course').length >= limit) break;
        }
      }
      if (results.filter(r => r.type === 'course').length >= limit) break;
    }
  }

  return results.slice(0, limit);
}
