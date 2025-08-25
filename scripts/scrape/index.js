const fs = require('fs-extra');
const path = require('path');
const BudgetScraper = require('./scraper');
const Geocoder = require('./geocoder');

async function main() {
  console.log('=== Łódź Civic Budget Scraper ===\n');
  
  const options = {
    verbose: process.argv.includes('--verbose'),
    rateLimit: 500,
    concurrent: 3
  };
  
  try {
    // Step 1: Scrape projects
    console.log('Step 1: Scraping projects from website...\n');
    const scraper = new BudgetScraper(options);
    const projects = await scraper.scrapeAll();
    
    if (projects.length === 0) {
      console.error('No projects scraped. Exiting.');
      process.exit(1);
    }
    
    // Save intermediate results
    const dataDir = path.join(process.cwd(), 'data');
    await fs.ensureDir(dataDir);
    
    const intermediateFile = path.join(dataDir, 'projekty-raw.json');
    await fs.writeJson(intermediateFile, projects, { spaces: 2 });
    console.log(`\nSaved raw data to ${intermediateFile}`);
    
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
          opis: p.opis,
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
    
    // Print summary
    console.log('\n=== Summary ===');
    console.log(`Total projects: ${geocodedProjects.length}`);
    console.log(`Successfully geocoded: ${geocodedProjects.filter(p => p.statusGeokodowania === 'success').length}`);
    console.log(`Failed geocoding: ${geocodedProjects.filter(p => p.statusGeokodowania === 'failed').length}`);
    console.log(`No address: ${geocodedProjects.filter(p => p.statusGeokodowania === 'no_address').length}`);
    
    // Categories summary
    const categories = [...new Set(geocodedProjects.map(p => p.kategoria).filter(Boolean))];
    console.log(`\nCategories found: ${categories.length}`);
    categories.slice(0, 5).forEach(c => console.log(`  - ${c}`));
    
    // Types summary
    const types = [...new Set(geocodedProjects.map(p => p.typ).filter(Boolean))];
    console.log(`\nTypes found: ${types.length}`);
    types.forEach(t => console.log(`  - ${t}`));
    
    // Districts summary
    const districts = [...new Set(geocodedProjects.map(p => p.osiedle).filter(Boolean))];
    console.log(`\nDistricts found: ${districts.length}`);
    districts.slice(0, 5).forEach(d => console.log(`  - ${d}`));
    
    console.log('\n✅ Scraping completed successfully!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };