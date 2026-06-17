export const seoService = {
  generateCollegeTitle: (college) => {
    if (!college) return "CounselWeb - College Insights";
    const name = college.meta?.shortName || college.meta?.name || "College Details";
    return `${name} - Fees, Placements, Rankings & Admissions`;
  },
  
  generateCollegeDescription: (college) => {
    if (!college) return "Explore comprehensive college details on CounselWeb.";
    return `Discover ${college.meta?.name} located in ${college.meta?.location}. Check out the latest placements averaging ₹${college.placements?.averagePackageLPA || 'N/A'} LPA, fees, and NIRF rankings.`;
  },
  
  generateSitemapXML: (colleges) => {
    const baseUrl = "https://counselweb.com";
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    // Core routes
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/search</loc>\n    <changefreq>daily</changefreq>\n  </url>\n`;
    
    // Dynamic college routes
    colleges.forEach(c => {
      xml += `  <url>\n    <loc>${baseUrl}/college/${c.collegeCode}</loc>\n    <changefreq>weekly</changefreq>\n  </url>\n`;
    });
    
    xml += `</urlset>`;
    return xml;
  },

  generateRobotsTxt: () => {
    return `User-agent: *
Allow: /
Allow: /search
Allow: /college/
Disallow: /profile
Disallow: /preferences
Disallow: /saved-colleges
Disallow: /history
Disallow: /api/

Sitemap: https://counselweb.com/sitemap.xml`;
  }
};
