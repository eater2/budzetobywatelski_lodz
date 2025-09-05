const BudgetScraperFromTxt = require('./scrape/scraper-from-txt');

async function testScraperL068() {
  const scraper = new BudgetScraperFromTxt({ verbose: true });
  
  await scraper.init();
  
  const url = 'https://budzetobywatelski.uml.lodz.pl/szczegoly-projektu-2026-1401956735-1401958701-4a5bc4d9d30b0fb7ad7d18e40dff1354';
  
  console.log('Testing scraper for L068...\n');
  const result = await scraper.scrapeProjectDetails(url);
  
  console.log('\nScraped result:');
  console.log('  id:', result.id);
  console.log('  nazwa:', result.nazwa);
  console.log('  osiedle:', result.osiedle);
  console.log('  typ:', result.typ);
  console.log('  kategoria:', result.kategoria);
  
  await scraper.cleanup();
}

testScraperL068().catch(console.error);