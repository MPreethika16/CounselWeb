// server/services/academicsParser.js

/**
 * Parses academic section HTML to extract structured data.
 * Utilizes Cheerio for DOM traversal.
 * Returns raw extracted fields; normalization & confidence are applied later.
 */
import * as cheerio from "cheerio";

// Helper regex patterns
const INTake_REGEX = /(?:intake|capacity|seats)[:\s]*([0-9,]+)\s*/i;
const FACULTY_REGEX = /(?:faculty\s*(?:members?)?)[:\s]*([0-9,]+)\s*/i;
const RATIO_REGEX = /student[-_]?faculty\s*ratio(?:[^0-9]{0,30})?([0-9]+)\s*[:/]?\s*([0-9]+)?/i; // captures "10:1" or "10"

export function parseAcademicsHTML(html, sourceUrl = "") {
  const $ = cheerio.load(html);

  // Utility to collect list items under a heading containing a keyword
  const collectListUnderHeading = (keyword) => {
    const items = [];
    // Find headings (h1‑h4) that contain the keyword (case‑insensitive)
    $(`h1,h2,h3,h4`).filter((_, el) => {
      return $(el).text().toLowerCase().includes(keyword);
    }).each((_, heading) => {
      // Look for the next sibling that is a UL/OL or a table
      let sibling = $(heading).next();
      while (sibling && sibling.length) {
        if (sibling.is('ul,ol')) {
          sibling.find('li').each((_, li) => {
            const txt = $(li).text().trim();
            if (txt) items.push(txt);
          });
          break;
        }
        if (sibling.is('table')) {
          sibling.find('tr').each((_, tr) => {
            const txt = $(tr).text().trim();
            if (txt) items.push(txt);
          });
          break;
        }
        sibling = sibling.next();
      }
    });
    return items;
  };

  // Departments, Programs, Specializations
  const departments = collectListUnderHeading('department');
  const programs = collectListUnderHeading('program');
  const specializations = collectListUnderHeading('specialization');

  // Numerical values – search whole body text
  const bodyText = $.root().text();
  const intakeMatch = bodyText.match(INTake_REGEX);
  const facultyMatch = bodyText.match(FACULTY_REGEX);
  const ratioMatch = bodyText.match(RATIO_REGEX);

  const intakeCapacity = intakeMatch ? parseInt(intakeMatch[1].replace(/,/g, ""), 10) : null;
  const facultyCount = facultyMatch ? parseInt(facultyMatch[1].replace(/,/g, ""), 10) : null;
  let studentFacultyRatio = null;
  if (ratioMatch) {
    // If ratio is expressed as "10:1" we keep the numerator (students per faculty)
    const first = parseInt(ratioMatch[1].replace(/,/g, ""), 10);
    const second = ratioMatch[2] ? parseInt(ratioMatch[2].replace(/,/g, ""), 10) : null;
    studentFacultyRatio = second ? Math.round((first / second) * 100) / 100 : first;
  }

  // URL collections based on anchor text keywords
  const collectUrls = (keywords) => {
    const urls = [];
    $('a').each((_, a) => {
      const txt = $(a).text().toLowerCase();
      const href = $(a).attr('href');
      if (!href) return;
      for (const kw of keywords) {
        if (txt.includes(kw)) {
          // Resolve relative URLs against sourceUrl if possible
          try {
            const absolute = new URL(href, sourceUrl).toString();
            urls.push(absolute);
          } catch {
            urls.push(href);
          }
          break;
        }
      }
    });
    return urls;
  };

  const curriculumUrls = collectUrls(['curriculum', 'syllabus', 'course structure']);
  const regulationUrls = collectUrls(['regulation', 'policy', 'academic regulation']);
  const academicCalendarUrls = collectUrls(['calendar', 'academic calendar']);

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
    confidence: 0, // placeholder – will be scored in normalizer
    sourceUrl: sourceUrl,
    extractedAt: new Date()
  };
}
