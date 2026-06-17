// server/services/academicsNormalizer.js

/**
 * Normalizes raw academic extraction data.
 * - Deduplicates array fields.
 * - Safely parses numeric fields.
 * - Calculates a confidence score (0‑100) based on richness of data.
 */

export function normalizeAcademics(raw) {
  const dedupe = (arr) => (Array.isArray(arr) ? [...new Set(arr.map((s) => s.trim()).filter(Boolean))] : []);

  const departments = dedupe(raw.departments);
  const programs = dedupe(raw.programs);
  const specializations = dedupe(raw.specializations);

  const intakeCapacity = Number.isInteger(raw.intakeCapacity) ? raw.intakeCapacity : null;
  const facultyCount = Number.isInteger(raw.facultyCount) ? raw.facultyCount : null;
  const studentFacultyRatio = typeof raw.studentFacultyRatio === "number" ? raw.studentFacultyRatio : null;

  const curriculumUrls = dedupe(raw.curriculumUrls);
  const regulationUrls = dedupe(raw.regulationUrls);
  const academicCalendarUrls = dedupe(raw.academicCalendarUrls);

  // Confidence: count how many categories have non‑empty data.
  const fields = [
    departments.length,
    programs.length,
    specializations.length,
    intakeCapacity !== null ? 1 : 0,
    facultyCount !== null ? 1 : 0,
    studentFacultyRatio !== null ? 1 : 0,
    curriculumUrls.length,
    regulationUrls.length,
    academicCalendarUrls.length,
  ];
  const filled = fields.reduce((a, v) => a + (v > 0 ? 1 : 0), 0);
  const confidence = Math.round((filled / 9) * 100);

  return {
    departments,
    programs,
    specializations,
    intakeCapacity,
    facultyCount,
    studentFacultyRatio,
    curriculumUrls,
    regulationUrls,
    academicCalendarUrls,
    confidence,
    sourceUrl: raw.sourceUrl || "",
    extractedAt: raw.extractedAt || new Date(),
  };
}
