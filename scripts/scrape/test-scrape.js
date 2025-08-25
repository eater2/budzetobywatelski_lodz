const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

async function testScrape() {
  console.log('Testing scraper on civic budget website...\n');
  
  // Test with axios/cheerio first (simpler)
  try {
    console.log('Method 1: Testing with axios/cheerio...');
    const response = await axios.get('https://budzetobywatelski.uml.lodz.pl/zlozone-projekty-2026', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('Page title:', $('title').text());
    console.log('Page H1:', $('h1').first().text());
    
    // Look for different types of links
    const projectLinks = [];
    
    // Strategy 1: Direct project links
    $('a[href*="szczegoly-projektu"]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text && i < 5) { // First 5 for testing
        projectLinks.push({ href, text });
        console.log(`Found project link: ${text.substring(0, 50)}...`);
      }
    });
    
    // Strategy 2: Check for project cards/items
    console.log('\nLooking for project containers...');
    const possibleSelectors = [
      '.project-item',
      '.projekt-item', 
      '.card',
      '.project-card',
      'article',
      '.list-item',
      '.bo-project',
      'tr[data-project]',
      '.table tbody tr'
    ];
    
    for (const selector of possibleSelectors) {
      const items = $(selector);
      if (items.length > 0) {
        console.log(`Found ${items.length} items with selector: ${selector}`);
        
        // Check first item structure
        const firstItem = items.first();
        console.log('First item HTML preview:', firstItem.html()?.substring(0, 200) + '...');
        break;
      }
    }
    
    // Check if there's a table with projects
    const tables = $('table');
    if (tables.length > 0) {
      console.log(`\nFound ${tables.length} tables on page`);
      tables.each((i, table) => {
        const headers = $(table).find('th').map((j, th) => $(th).text().trim()).get();
        console.log(`Table ${i + 1} headers:`, headers);
        
        const rows = $(table).find('tbody tr');
        console.log(`Table ${i + 1} has ${rows.length} data rows`);
        
        if (rows.length > 0) {
          // Sample first row
          const firstRow = rows.first();
          const cells = firstRow.find('td').map((j, td) => $(td).text().trim().substring(0, 30)).get();
          console.log('First row data:', cells);
        }
      });
    }
    
    // Check for pagination or load more buttons
    const pagination = $('.pagination, .page-numbers, .load-more, [data-page]');
    if (pagination.length > 0) {
      console.log('\nFound pagination elements:', pagination.length);
    }
    
    // Check for JavaScript-rendered content indicators
    const scriptTags = $('script').filter((i, el) => {
      const src = $(el).attr('src') || '';
      const content = $(el).html() || '';
      return src.includes('react') || src.includes('vue') || src.includes('angular') || 
             content.includes('projects') || content.includes('projekty');
    });
    
    if (scriptTags.length > 0) {
      console.log('\nDetected JavaScript framework - content may be dynamically loaded');
    }
    
  } catch (error) {
    console.error('Axios/Cheerio test failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test with Puppeteer for dynamic content
  console.log('Method 2: Testing with Puppeteer (for dynamic content)...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new'
  });
  
  try {
    const page = await browser.newPage();
    
    await page.goto('https://budzetobywatelski.uml.lodz.pl/zlozone-projekty-2026', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for potential dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get page content after JavaScript execution
    const pageData = await page.evaluate(() => {
      const data = {
        title: document.title,
        h1: document.querySelector('h1')?.textContent,
        projectLinks: [],
        containers: {},
        tables: []
      };
      
      // Find project links
      document.querySelectorAll('a[href*="szczegoly-projektu"]').forEach((link, i) => {
        if (i < 10) { // First 10
          data.projectLinks.push({
            href: link.href,
            text: link.textContent.trim().substring(0, 50)
          });
        }
      });
      
      // Check for containers
      const selectors = [
        '.project-item',
        '.projekt-item',
        '.card',
        'article',
        '.list-group-item',
        '.bo-project',
        '[class*="project"]',
        '[class*="projekt"]'
      ];
      
      selectors.forEach(selector => {
        const items = document.querySelectorAll(selector);
        if (items.length > 0) {
          data.containers[selector] = items.length;
        }
      });
      
      // Check tables
      document.querySelectorAll('table').forEach((table, i) => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const rowCount = table.querySelectorAll('tbody tr').length;
        data.tables.push({ headers, rowCount });
      });
      
      return data;
    });
    
    console.log('Page title:', pageData.title);
    console.log('H1:', pageData.h1);
    console.log('\nProject links found:', pageData.projectLinks.length);
    pageData.projectLinks.slice(0, 5).forEach(link => {
      console.log(`  - ${link.text}...`);
    });
    
    console.log('\nContainers found:');
    Object.entries(pageData.containers).forEach(([selector, count]) => {
      console.log(`  ${selector}: ${count} items`);
    });
    
    if (pageData.tables.length > 0) {
      console.log('\nTables found:');
      pageData.tables.forEach((table, i) => {
        console.log(`  Table ${i + 1}:`);
        console.log(`    Headers: ${table.headers.join(', ')}`);
        console.log(`    Rows: ${table.rowCount}`);
      });
    }
    
    // Try to find if there's an API endpoint
    const networkRequests = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('api') || url.includes('json') || url.includes('projekty')) {
        networkRequests.push(url);
      }
    });
    
    // Reload page to capture network requests
    await page.reload({ waitUntil: 'networkidle2' });
    
    if (networkRequests.length > 0) {
      console.log('\nPotential API endpoints detected:');
      networkRequests.slice(0, 5).forEach(url => {
        console.log(`  - ${url}`);
      });
    }
    
  } finally {
    await browser.close();
  }
}

testScrape().catch(console.error);