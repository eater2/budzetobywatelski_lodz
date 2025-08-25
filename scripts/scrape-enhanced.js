const fs = require('fs-extra');
const path = require('path');
const EnhancedBudgetScraper = require('./scrape/enhanced-scraper');
const Geocoder = require('./scrape/geocoder');

async function main() {
  console.log('=== Enhanced Łódź Civic Budget Scraper ===\n');
  
  const options = {
    verbose: process.argv.includes('--verbose'),
    rateLimit: 1000, // 1 second between requests
  };
  
  try {
    // Step 1: Scrape projects
    console.log('Step 1: Scraping all projects from website...\n');
    const scraper = new EnhancedBudgetScraper(options);
    const projects = await scraper.scrapeAll();
    
    if (projects.length === 0) {
      console.error('No projects scraped. Exiting.');
      process.exit(1);
    }
    
    // Save intermediate results
    const dataDir = path.join(process.cwd(), 'data');
    await fs.ensureDir(dataDir);
    
    const rawFile = path.join(dataDir, 'projekty-raw.json');
    await fs.writeJson(rawFile, projects, { spaces: 2 });
    console.log(`\nSaved raw data to ${rawFile}`);
    
    // Step 2: Geocode addresses
    console.log('\nStep 2: Geocoding project locations...\n');
    const geocoder = new Geocoder(options);
    const geocodedProjects = await geocoder.geocodeProjects(projects);
    
    // Step 3: Generate final output
    console.log('\nStep 3: Generating final output files...\n');
    
    // Main JSON file
    const mainOutput = {
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        totalProjects: geocodedProjects.length,
        source: 'web-scraping',
        geocoded: geocodedProjects.filter(p => p.statusGeokodowania === 'success').length,
        failed: geocodedProjects.filter(p => p.statusGeokodowania === 'failed').length
      },
      projects: geocodedProjects
    };
    
    const mainFile = path.join(dataDir, 'projekty.json');
    await fs.writeJson(mainFile, mainOutput, { spaces: 2 });
    console.log(`Saved main data to ${mainFile}`);
    
    // GeoJSON file for map
    const geoJsonFeatures = geocodedProjects
      .filter(p => p.lat && p.lng)
      .map(p => ({
        type: 'Feature',
        properties: {
          id: p.id,
          nazwa: p.nazwa,
          typ: p.typ,
          kategoria: p.kategoria,
          osiedle: p.osiedle,
          koszt: p.koszt,
          opis: p.opis ? p.opis.substring(0, 200) : '',
          linkZrodlowy: p.linkZrodlowy
        },
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat]
        }
      }));
    
    const geoJson = {
      type: 'FeatureCollection',
      features: geoJsonFeatures
    };
    
    const geoFile = path.join(dataDir, 'projekty.geo.json');
    await fs.writeJson(geoFile, geoJson, { spaces: 2 });
    console.log(`Saved GeoJSON to ${geoFile}`);
    
    // Print detailed summary
    console.log('\n' + '='.repeat(50));
    console.log('=== SCRAPING SUMMARY ===');
    console.log('='.repeat(50));
    
    console.log(`\nTotal projects scraped: ${geocodedProjects.length}`);
    console.log(`Successfully geocoded: ${geocodedProjects.filter(p => p.statusGeokodowania === 'success').length}`);
    console.log(`Failed geocoding: ${geocodedProjects.filter(p => p.statusGeokodowania === 'failed').length}`);
    console.log(`No address: ${geocodedProjects.filter(p => p.statusGeokodowania === 'no_address').length}`);
    
    // Categories summary
    const categories = [...new Set(geocodedProjects.map(p => p.kategoria).filter(Boolean))];
    console.log(`\nUnique categories: ${categories.length}`);
    if (categories.length > 0) {
      console.log('Sample categories:');
      categories.slice(0, 10).forEach(c => console.log(`  • ${c}`));
    }
    
    // Types summary
    const types = [...new Set(geocodedProjects.map(p => p.typ).filter(Boolean))];
    console.log(`\nProject types: ${types.length}`);
    types.forEach(t => {
      const count = geocodedProjects.filter(p => p.typ === t).length;
      console.log(`  • ${t}: ${count} projects`);
    });
    
    // Districts summary  
    const districts = [...new Set(geocodedProjects.map(p => p.osiedle).filter(Boolean))];
    console.log(`\nUnique districts: ${districts.length}`);
    if (districts.length > 0) {
      console.log('Sample districts:');
      districts.slice(0, 10).forEach(d => console.log(`  • ${d}`));
    }
    
    // Cost analysis
    const projectsWithCost = geocodedProjects.filter(p => p.koszt > 0);
    if (projectsWithCost.length > 0) {
      const totalCost = projectsWithCost.reduce((sum, p) => sum + p.koszt, 0);
      const avgCost = Math.round(totalCost / projectsWithCost.length);
      const minCost = Math.min(...projectsWithCost.map(p => p.koszt));
      const maxCost = Math.max(...projectsWithCost.map(p => p.koszt));
      
      console.log(`\nCost analysis:`);
      console.log(`  • Projects with cost data: ${projectsWithCost.length}`);
      console.log(`  • Total budget: ${totalCost.toLocaleString('pl-PL')} zł`);
      console.log(`  • Average cost: ${avgCost.toLocaleString('pl-PL')} zł`);
      console.log(`  • Min cost: ${minCost.toLocaleString('pl-PL')} zł`);
      console.log(`  • Max cost: ${maxCost.toLocaleString('pl-PL')} zł`);
    }
    
    // Sample projects
    console.log(`\nSample projects:`);
    geocodedProjects.slice(0, 3).forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.nazwa || 'Untitled'}`);
      console.log(`   ID: ${p.id || 'N/A'}`);
      console.log(`   Type: ${p.typ || 'N/A'}`);
      console.log(`   District: ${p.osiedle || 'N/A'}`);
      console.log(`   Cost: ${p.koszt ? p.koszt.toLocaleString('pl-PL') + ' zł' : 'N/A'}`);
      console.log(`   Location: ${p.lokalizacjaTekst || 'N/A'}`);
      console.log(`   Geocoded: ${p.statusGeokodowania === 'success' ? `✓ (${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)})` : '✗'}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Scraping completed successfully!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };