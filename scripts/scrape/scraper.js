const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { default: pLimit } = require('p-limit');
const Logger = require('../utils/logger');
const Cache = require('../utils/cache');
const RateLimiter = require('../utils/rateLimiter');

class BudgetScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://budzetobywatelski.uml.lodz.pl';
    this.logger = new Logger(options.verbose);
    this.cache = new Cache(path.join(process.cwd(), 'data/.cache/scrape.json'));
    this.rateLimiter = new RateLimiter(options.rateLimit || 500);
    this.limit = pLimit(options.concurrent || 5);
    this.projects = [];
    this.browser = null;
  }

  async init() {
    this.logger.info('Initializing Puppeteer browser...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrapeProjectList() {
    this.logger.info('Scraping project list...');
    const page = await this.browser.newPage();
    
    try {
      // Navigate to projects list page
      const listUrl = `${this.baseUrl}/zlozone-projekty-2026`;
      await page.goto(listUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for projects to load
      await page.waitForSelector('.project-item, .projekt-item, article', { timeout: 30000 });
      
      // Extract project links and basic info
      const projectData = await page.evaluate(() => {
        const projects = [];
        
        // Try different possible selectors
        const items = document.querySelectorAll('.project-item, .projekt-item, article, .card');
        
        items.forEach(item => {
          // Extract link
          const linkEl = item.querySelector('a[href*="szczegoly-projektu"]');
          if (!linkEl) return;
          
          const link = linkEl.href;
          
          // Extract ID from link
          const idMatch = link.match(/szczegoly-projektu-\d+-(\d+)-/);
          const id = idMatch ? idMatch[1] : null;
          
          // Extract title
          const titleEl = item.querySelector('h2, h3, .title, .projekt-title');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // Extract type
          const typeEl = item.querySelector('.type, .typ, .badge');
          const type = typeEl ? typeEl.textContent.trim() : '';
          
          // Extract district
          const districtEl = item.querySelector('.district, .osiedle, .location');
          const district = districtEl ? districtEl.textContent.trim() : '';
          
          projects.push({
            link,
            id,
            title,
            type,
            district
          });
        });
        
        return projects;
      });
      
      this.logger.success(`Found ${projectData.length} projects on list page`);
      
      // Store basic project data
      this.projects = projectData;
      
      await page.close();
      return projectData;
      
    } catch (error) {
      this.logger.error('Failed to scrape project list', error);
      await page.close();
      
      // Try alternative approach with axios
      return await this.scrapeListWithAxios();
    }
  }

  async scrapeListWithAxios() {
    this.logger.info('Trying alternative scraping method with axios...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/zlozone-projekty-2026`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const projects = [];
      
      // Try to find project links
      $('a[href*="szczegoly-projektu"]').each((i, el) => {
        const link = $(el).attr('href');
        const fullLink = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
        
        // Extract ID from link
        const idMatch = fullLink.match(/szczegoly-projektu-\d+-(\d+)-/);
        const id = idMatch ? idMatch[1] : `project-${i}`;
        
        // Try to get title from link text or nearby elements
        let title = $(el).text().trim();
        if (!title) {
          title = $(el).parent().find('h2, h3').first().text().trim();
        }
        
        projects.push({
          link: fullLink,
          id,
          title: title || `Project ${id}`,
          type: '',
          district: ''
        });
      });
      
      this.logger.success(`Found ${projects.length} project links`);
      this.projects = projects;
      return projects;
      
    } catch (error) {
      this.logger.error('Failed to scrape with axios', error);
      return [];
    }
  }

  async scrapeProjectDetails(projectUrl) {
    // Check cache first
    if (this.cache.has(projectUrl)) {
      this.logger.debug(`Using cached data for ${projectUrl}`);
      return this.cache.get(projectUrl);
    }
    
    await this.rateLimiter.wait();
    
    const page = await this.browser.newPage();
    
    try {
      this.logger.debug(`Scraping details from ${projectUrl}`);
      
      await page.goto(projectUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Extract project details
      const projectDetails = await page.evaluate(() => {
        const data = {};
        
        // Try different strategies to extract data
        
        // Strategy 1: Look for labeled data
        const labels = document.querySelectorAll('dt, .label, .field-label, strong');
        labels.forEach(label => {
          const text = label.textContent.toLowerCase().trim();
          const valueEl = label.nextElementSibling || label.parentElement.nextElementSibling;
          
          if (text.includes('numer') || text.includes('id')) {
            data.id = valueEl?.textContent.trim();
          } else if (text.includes('nazwa') || text.includes('tytuł')) {
            data.nazwa = valueEl?.textContent.trim();
          } else if (text.includes('typ')) {
            data.typ = valueEl?.textContent.trim();
          } else if (text.includes('kategoria')) {
            data.kategoria = valueEl?.textContent.trim();
          } else if (text.includes('osiedle') || text.includes('dzielnica')) {
            data.osiedle = valueEl?.textContent.trim();
          } else if (text.includes('lokalizacja') || text.includes('miejsce')) {
            data.lokalizacja = valueEl?.textContent.trim();
          } else if (text.includes('koszt') || text.includes('budżet')) {
            data.koszt = valueEl?.textContent.trim();
          } else if (text.includes('opis')) {
            data.opis = valueEl?.textContent.trim();
          }
        });
        
        // Strategy 2: Look for common patterns
        if (!data.nazwa) {
          const h1 = document.querySelector('h1, .project-title, .page-title');
          if (h1) data.nazwa = h1.textContent.trim();
        }
        
        if (!data.opis) {
          const desc = document.querySelector('.description, .opis, .content, article p');
          if (desc) data.opis = desc.textContent.trim();
        }
        
        // Strategy 3: Table extraction
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length === 2) {
              const label = cells[0].textContent.toLowerCase().trim();
              const value = cells[1].textContent.trim();
              
              if (label.includes('numer')) data.id = value;
              if (label.includes('nazwa')) data.nazwa = value;
              if (label.includes('typ')) data.typ = value;
              if (label.includes('kategoria')) data.kategoria = value;
              if (label.includes('osiedle')) data.osiedle = value;
              if (label.includes('lokalizacja')) data.lokalizacja = value;
              if (label.includes('koszt')) data.koszt = value;
            }
          });
        });
        
        return data;
      });
      
      // Normalize the data
      const normalizedProject = this.normalizeProject(projectDetails);
      normalizedProject.linkZrodlowy = projectUrl;
      
      // Cache the result
      this.cache.set(projectUrl, normalizedProject);
      
      await page.close();
      this.logger.stats.scraped++;
      
      return normalizedProject;
      
    } catch (error) {
      this.logger.error(`Failed to scrape ${projectUrl}`, error);
      this.logger.stats.failed++;
      await page.close();
      return null;
    }
  }

  normalizeProject(raw) {
    return {
      id: raw.id?.trim() || '',
      nazwa: raw.nazwa?.trim() || '',
      typ: this.normalizeType(raw.typ),
      kategoria: raw.kategoria?.trim() || '',
      osiedle: raw.osiedle?.trim() || '',
      lokalizacjaTekst: raw.lokalizacja?.trim() || '',
      koszt: this.parseCost(raw.koszt),
      opis: raw.opis?.trim() || '',
      dataPobrania: new Date().toISOString()
    };
  }

  normalizeType(type) {
    if (!type) return '';
    const normalized = type.toUpperCase().trim();
    
    if (normalized.includes('OSIEDLOW')) return 'OSIEDLOWE';
    if (normalized.includes('PONADOSIEDLOW')) return 'PONADOSIEDLOWE';
    if (normalized.includes('OGÓLNOMIEJSK') || normalized.includes('MIEJSK')) return 'OGÓLNOMIEJSKIE';
    
    return normalized;
  }

  parseCost(costString) {
    if (!costString) return 0;
    if (typeof costString === 'number') return costString;
    
    // Remove all non-digit characters except comma and period
    const cleaned = costString.replace(/[^\d,\.]/g, '');
    // Replace comma with period for decimal
    const normalized = cleaned.replace(',', '.');
    // Parse as float and round
    return Math.round(parseFloat(normalized) || 0);
  }

  async scrapeAll() {
    try {
      await this.init();
      
      // Step 1: Get project list
      const projectList = await this.scrapeProjectList();
      
      if (projectList.length === 0) {
        this.logger.error('No projects found on list page');
        return [];
      }
      
      // Step 2: Scrape details for each project
      this.logger.info(`Starting to scrape ${projectList.length} project details...`);
      
      const detailPromises = projectList.map((project, index) => 
        this.limit(async () => {
          this.logger.progress(index + 1, projectList.length, `Scraping ${project.title || project.id}`);
          const details = await this.scrapeProjectDetails(project.link);
          
          if (details) {
            // Merge with basic info
            return {
              ...details,
              ...project,
              ...details // Details override basic info
            };
          }
          return null;
        })
      );
      
      const projects = await Promise.all(detailPromises);
      const validProjects = projects.filter(p => p !== null);
      
      this.logger.success(`Successfully scraped ${validProjects.length} projects`);
      this.logger.printStats();
      
      return validProjects;
      
    } finally {
      await this.cleanup();
    }
  }
}

module.exports = BudgetScraper;