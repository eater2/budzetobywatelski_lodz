const fs = require('fs-extra');
const path = require('path');

// Function to generate SEO-friendly slug from project name
function generateSlug(nazwa, id) {
  const slug = nazwa
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);

  return `${slug}-${id}`;
}

async function generateRedirects(data, publicDir) {
  const redirects = [];

  // Generate redirects from old ID-based URLs to new slug-based URLs
  if (data.projects) {
    for (const project of data.projects) {
      if (project.id && project.nazwa) {
        const slug = generateSlug(project.nazwa, project.id);
        redirects.push({
          source: `/projekty/${project.id}`,
          destination: `/projekty/${slug}.html`,
          permanent: true
        });
      }
    }
  }

  // Write redirects to vercel.json format
  const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
  const vercelConfig = await fs.readJson(vercelConfigPath);

  vercelConfig.redirects = redirects;

  await fs.writeJson(vercelConfigPath, vercelConfig, { spaces: 2 });

  console.log(`✅ Generated ${redirects.length} redirects in vercel.json`);
}

module.exports = generateRedirects;
