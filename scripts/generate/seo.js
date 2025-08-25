const fs = require('fs-extra');
const path = require('path');

class SEOGenerator {
  static async generateMetaTags(data, publicDir) {
    // This function can be used to generate additional SEO metadata
    // For now, meta tags are embedded directly in HTML templates
    
    const stats = {
      totalProjects: data.projects?.length || 0,
      categories: [...new Set(data.projects?.map(p => p.kategoria).filter(Boolean))] || [],
      districts: [...new Set(data.projects?.map(p => p.osiedle).filter(Boolean))] || [],
      types: [...new Set(data.projects?.map(p => p.typ).filter(Boolean))] || [],
      totalCost: data.projects?.reduce((sum, p) => sum + (p.koszt || 0), 0) || 0,
      geocoded: data.projects?.filter(p => p.lat && p.lng).length || 0
    };
    
    // Generate a meta.json file with site statistics for potential use
    const metaPath = path.join(publicDir, 'data', 'meta.json');
    await fs.writeJson(metaPath, {
      generated: new Date().toISOString(),
      stats: stats,
      seo: {
        title: 'Budżet Obywatelski Łódź – mapa projektów 2025/2026',
        description: `Interaktywna mapa i lista ${stats.totalProjects} projektów budżetu obywatelskiego Łodzi 2025/2026. Filtruj po kategoriach, osiedlach i kosztach. Zobacz lokalizacje na mapie i Street View.`,
        keywords: [
          'budżet obywatelski łódź mapa',
          'budżet obywatelski 2025 łódź', 
          'bo łódź 2026',
          'mapa projektów łódź',
          'lbo łódź mapa',
          'projekty obywatelskie łódź'
        ],
        categories: stats.categories,
        districts: stats.districts
      }
    }, { spaces: 2 });
    
    console.log('✅ Generated SEO metadata');
    return stats;
  }
}

module.exports = { generateSEO: SEOGenerator };