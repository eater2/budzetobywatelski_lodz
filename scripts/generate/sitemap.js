const fs = require('fs-extra');
const path = require('path');

async function generateSitemap(data, publicDir) {
  const baseUrl = 'https://budzetobywatelski.vercel.app';
  const currentDate = new Date().toISOString().split('T')[0];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Individual Project Pages -->`;

  // Add individual project pages
  if (data.projects) {
    for (const project of data.projects) {
      if (project.id && project.nazwa) {
        sitemap += `
  <url>
    <loc>${baseUrl}/projekty/${project.id}.html</loc>
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
  console.log(`✅ Generated sitemap.xml with ${data.projects?.length + 1 || 1} URLs`);
}

module.exports = generateSitemap;