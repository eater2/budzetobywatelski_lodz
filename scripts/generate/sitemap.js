const fs = require('fs-extra');
const path = require('path');

// Function to generate SEO-friendly slug from project name
function generateSlug(nazwa, id) {
  // Remove special characters, convert to lowercase, replace spaces with hyphens
  const slug = nazwa
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Keep only alphanumeric, spaces, and hyphens
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .substring(0, 60); // Limit length for URL friendliness
  
  // Return slug with ID appended
  return `${slug}-${id}`;
}

async function generateSitemap(data, publicDir) {
  const baseUrl = 'https://budzetobywatelski-lodz.vercel.app';
  const currentDate = new Date().toISOString().split('T')[0];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Individual Project Pages -->`;

  // Add individual project pages (sorted by ID for consistency)
  if (data.projects) {
    const sortedProjects = data.projects.sort((a, b) => a.id.localeCompare(b.id));
    for (const project of sortedProjects) {
      if (project.id && project.nazwa) {
        const slug = generateSlug(project.nazwa, project.id);
        sitemap += `
  <url>
    <loc>${baseUrl}/projekty/${slug}.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }
  }

  sitemap += `
</urlset>`;

  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), sitemap);
  
  // Also generate a robots.txt file if it doesn't exist
  const robotsPath = path.join(publicDir, 'robots.txt');
  if (!(await fs.pathExists(robotsPath))) {
    const robotsContent = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay (optional, helps with server load)
Crawl-delay: 1

# Allow all search engines
User-agent: *
Disallow: /api/
Disallow: /_vercel/
Disallow: /*.json$`;
    
    await fs.writeFile(robotsPath, robotsContent);
    console.log('✅ Generated robots.txt');
  }
  
  console.log(`✅ Generated sitemap.xml with ${(data.projects?.length || 0) + 1} URLs`);
}

module.exports = generateSitemap;