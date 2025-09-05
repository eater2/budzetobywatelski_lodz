const fs = require('fs-extra');
const path = require('path');

async function generateSitemap(data, publicDir) {
  const baseUrl = 'https://budzetobywatelski.vercel.app';
  const currentDate = new Date().toISOString().split('T')[0];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <!-- Main Page -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <mobile:mobile/>
  </url>
  
  <!-- Individual Project Pages -->`;

  // Add individual project pages (sorted by ID for consistency)
  if (data.projects) {
    const sortedProjects = data.projects.sort((a, b) => a.id.localeCompare(b.id));
    for (const project of sortedProjects) {
      if (project.id && project.nazwa) {
        sitemap += `
  <url>
    <loc>${baseUrl}/projekty/${project.id}.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <mobile:mobile/>
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