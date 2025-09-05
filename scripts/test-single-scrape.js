const puppeteer = require('puppeteer');

async function testScrape() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const url = 'https://budzetobywatelski.uml.lodz.pl/szczegoly-projektu-2026-1401956735-1401958701-4a5bc4d9d30b0fb7ad7d18e40dff1354';
  
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Extract all text content from paragraphs to debug
  const debugInfo = await page.evaluate(() => {
    const data = {
      allParagraphs: [],
      foundLabels: [],
      extractedData: {}
    };
    
    // Get all paragraph elements
    const paragraphs = document.querySelectorAll('article p, main p, .container p');
    
    paragraphs.forEach((p, index) => {
      const text = p.textContent.trim();
      data.allParagraphs.push({
        index,
        text: text.substring(0, 200), // First 200 chars
        isBold: p.classList.contains('font-weight-bold'),
        classes: Array.from(p.classList)
      });
      
      // Check if this is a label (bold text ending with colon)
      if (p.classList.contains('font-weight-bold') && text.endsWith(':')) {
        const label = text.toLowerCase().replace(':', '').trim();
        data.foundLabels.push(label);
        
        // Try to get the next sibling or next paragraph
        const nextP = paragraphs[index + 1];
        if (nextP && !nextP.classList.contains('font-weight-bold')) {
          const value = nextP.textContent.trim();
          
          if (label.includes('rodzaj zadania') || label.includes('nazwa osiedla')) {
            data.extractedData.rodzajZadania = value;
            
            // Parse the value
            if (value.includes('PONADOSIEDLOWE')) {
              data.extractedData.parsedOsiedle = 'PONADOSIEDLOWE';
              data.extractedData.parsedTyp = 'ponadosiedlowe';
            } else if (value.includes('OSIEDLOWE')) {
              const parts = value.split('-').map(p => p.trim());
              if (parts.length > 1) {
                data.extractedData.parsedOsiedle = parts.slice(1).join(' - ').trim();
              }
              data.extractedData.parsedTyp = 'osiedlowe';
            }
          }
          
          if (label.includes('dodatkowe informacje o lokalizacji')) {
            data.extractedData.dodatkoweInfo = value;
            // Check if Chojny-Dąbrowa comes from here
            if (value.includes('Osiedle:')) {
              const osiedleMatch = value.match(/Osiedle:\s*([^;]+)/);
              if (osiedleMatch) {
                data.extractedData.osiedleFromDodatkowe = osiedleMatch[1].trim();
              }
            }
          }
        }
      }
    });
    
    return data;
  });
  
  console.log('\n=== Debug Information ===');
  console.log('Found labels:', debugInfo.foundLabels);
  console.log('\nExtracted data:', debugInfo.extractedData);
  console.log('\nAll paragraphs (first 10):');
  debugInfo.allParagraphs.slice(0, 10).forEach(p => {
    console.log(`  [${p.index}] Bold: ${p.isBold}, Text: "${p.text}"`);
  });
  
  await browser.close();
}

testScrape().catch(console.error);