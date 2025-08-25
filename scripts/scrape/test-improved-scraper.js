const BudgetScraperFromTxt = require('./scraper-from-txt');

async function testScraper() {
  console.log('=== Testing Improved Scraper ===\n');
  
  const options = {
    verbose: true,
    rateLimit: 1000,
    concurrent: 1
  };
  
  // Test URLs
  const testUrls = [
    'https://budzetobywatelski.uml.lodz.pl/szczegoly-projektu-2026-1401956735-1401956971-45818753838a0f1ad4e84fc223c3f39d',
    'https://budzetobywatelski.uml.lodz.pl/szczegoly-projektu-2026-1401956735-1401956994-f38ed85961323b3465b28a24db1cc2e6',
    'https://budzetobywatelski.uml.lodz.pl/szczegoly-projektu-2026-1401956735-1401957070-26039208002ff75469cab22acbe3fdaf'
  ];
  
  try {
    const scraper = new BudgetScraperFromTxt(options);
    await scraper.init();
    
    console.log(`Testing ${testUrls.length} URLs...\n`);
    
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      console.log(`\n=== Test ${i + 1}/${testUrls.length} ===`);
      console.log(`URL: ${url}`);
      
      try {
        const result = await scraper.scrapeProjectDetails(url);
        
        console.log('\nExtracted data:');
        console.log(`ID: ${result.id}`);
        console.log(`Nazwa: ${result.nazwa}`);
        console.log(`Typ: ${result.typ}`);
        console.log(`Kategoria: ${result.kategoria}`);
        console.log(`Osiedle: ${result.osiedle}`);
        console.log(`Lokalizacja: ${result.lokalizacjaTekst ? result.lokalizacjaTekst.substring(0, 100) : 'brak'}`);
        console.log(`Koszt: ${result.koszt}`);
        console.log(`Opis: ${result.opis ? result.opis.substring(0, 200) + '...' : 'brak'}`);
        console.log(`Coordinates: lat=${result.lat}, lng=${result.lng}`);
        console.log(`Status geocoding: ${result.statusGeokodowania}`);
        
        // Check if we got meaningful data
        const hasData = result.id && result.nazwa && result.kategoria;
        const hasCoords = result.lat && result.lng;
        console.log(`\n✅ Data extraction: ${hasData ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Coordinates: ${hasCoords ? 'SUCCESS' : 'FAILED'}`);
        
      } catch (error) {
        console.log(`\n❌ Error scraping: ${error.message}`);
      }
    }
    
    await scraper.cleanup();
    console.log('\n=== Test completed ===');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testScraper();
}

module.exports = { testScraper };