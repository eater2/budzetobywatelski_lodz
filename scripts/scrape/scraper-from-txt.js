const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { default: pLimit } = require('p-limit');
const Logger = require('../utils/logger');
const Cache = require('../utils/cache');
const RateLimiter = require('../utils/rateLimiter');

class BudgetScraperFromTxt {
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
    await this.cache.save();
  }

  async loadProjectsFromFile(filePath) {
    this.logger.info(`Loading project URLs from ${filePath}...`);
    
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    
    const projects = [];
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line) continue;
      
      let url = line;
      
      // Handle relative URLs
      if (!url.startsWith('http')) {
        url = url.startsWith('/') ? `${this.baseUrl}${url}` : `${this.baseUrl}/${url}`;
      }
      
      // Extract ID from URL if possible
      const idMatch = url.match(/szczegoly-projektu-\d+-(\d+)-/);
      const id = idMatch ? idMatch[1] : `project-${projects.length + 1}`;
      
      projects.push({
        link: url,
        id: id,
        title: '', // Will be filled during scraping
        type: '',
        district: ''
      });
    }
    
    this.logger.success(`Loaded ${projects.length} project URLs from file`);
    this.projects = projects;
    return projects;
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
        
        // Get all paragraph elements in the project details section
        const paragraphs = document.querySelectorAll('article p, main p, .container p');
        
        let currentLabel = '';
        
        paragraphs.forEach(p => {
          const text = p.textContent.trim();
          
          // Check if this is a label (bold text ending with colon)
          if (p.classList.contains('font-weight-bold') && text.endsWith(':')) {
            currentLabel = text.toLowerCase().replace(':', '').trim();
          } else if (currentLabel && text && !text.endsWith(':')) {
            // This is content for the current label
            const cleanText = text.trim();
            
            switch (currentLabel) {
              case 'numer id':
                data.id = cleanText;
                break;
              case 'nazwa i lokalizacja':
                data.nazwa = cleanText;
                break;
              case 'szczegóły dotyczące lokalizacji':
                data.lokalizacjaTekst = cleanText;
                break;
              case 'dodatkowe informacje o lokalizacji':
                if (!data.lokalizacjaTekst) data.lokalizacjaTekst = cleanText;
                // Extract district from this field
                if (cleanText.includes('Osiedle:')) {
                  const osiedleMatch = cleanText.match(/Osiedle:\s*([^;]+)/);
                  if (osiedleMatch) data.osiedle = osiedleMatch[1].trim();
                }
                break;
              case 'rodzaj zadania / nazwa osiedla':
              case 'rodzaj zadania':
                const typeMatch = cleanText.match(/^(OSIEDLOWE|OGÓLNOMIEJSKI|PONADOSIEDLOWY)/i);
                if (typeMatch) data.typ = typeMatch[1].toLowerCase();
                // Extract district if not already found
                if (!data.osiedle && cleanText.includes(' - ')) {
                  const parts = cleanText.split(' - ');
                  if (parts.length >= 3) data.osiedle = parts[2].trim();
                }
                break;
              case 'kategoria projektu':
                data.kategoria = cleanText;
                break;
              case 'opis projektu':
                data.opis = cleanText;
                break;
            }
            
            currentLabel = ''; // Reset after processing
          }
        });
        
        // Extract cost from tables
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const lastCell = cells[cells.length - 1];
              const text = lastCell.textContent.trim();
              // Look for final cost in bold
              if (lastCell.querySelector('strong') && text.includes('zł')) {
                const costMatch = text.match(/([\d\s,]+)\.(\d{2})\s*zł/);
                if (costMatch) {
                  data.koszt = costMatch[1].replace(/\s/g, '') + '.' + costMatch[2];
                }
              }
            }
          });
        });
        
        // Alternative extraction using div elements
        const divs = document.querySelectorAll('article div, main div');
        divs.forEach(div => {
          const text = div.textContent.trim();
          
          // Look for description in div elements
          if (!data.opis && text.length > 100 && !text.includes('Numer ID') && !text.includes('Nazwa i lokalizacja')) {
            // This might be the description
            data.opis = text;
          }
        });
        
        // Extract coordinates from map widget
        const mapWidget = document.querySelector('.we-mapcreator[data-default-lon][data-default-lat]');
        if (mapWidget) {
          const lon = mapWidget.getAttribute('data-default-lon');
          const lat = mapWidget.getAttribute('data-default-lat');
          
          if (lon && lat) {
            data.lon = parseFloat(lon);
            data.lat = parseFloat(lat);
            data.hasCoordinates = true;
          }
        }
        
        return data;
      });
      
      // Normalize the data
      const normalizedProject = this.normalizeProject(projectDetails);
      normalizedProject.linkZrodlowy = projectUrl;
      
      // Cache the result
      this.cache.set(projectUrl, normalizedProject);
      
      await page.close();
      
      return normalizedProject;
      
    } catch (error) {
      this.logger.error(`Failed to scrape ${projectUrl}`, error);
      await page.close();
      return null;
    }
  }

  normalizeProject(project) {
    // Determine geocoding status based on coordinates
    let statusGeokodowania = 'no_address';
    let lat = null;
    let lng = null;
    
    if (project.hasCoordinates && project.lat && project.lon) {
      statusGeokodowania = 'success';
      lat = project.lat;
      lng = project.lon;
    }
    
    return {
      id: project.id || '',
      nazwa: project.nazwa || '',
      typ: this.normalizeType(project.typ),
      kategoria: project.kategoria || '',
      osiedle: project.osiedle || '',
      lokalizacjaTekst: project.lokalizacja || '',
      koszt: this.normalizeCost(project.koszt),
      opis: project.opis || '',
      statusGeokodowania: statusGeokodowania,
      lat: lat,
      lng: lng,
      heading: 0,
      pitch: 0,
      fov: 90
    };
  }

  normalizeType(type) {
    if (!type) return 'nieznany';
    
    const normalized = type.toLowerCase().trim();
    
    if (normalized.includes('ogólnomiejski') || normalized.includes('ogolnomiejski')) {
      return 'ogólnomiejski';
    } else if (normalized.includes('osiedlowy') || normalized.includes('dzielnicowy')) {
      return 'osiedlowy';
    } else if (normalized.includes('ponadosiedlowy')) {
      return 'ponadosiedlowy';
    }
    
    return normalized;
  }

  normalizeCost(cost) {
    if (!cost) return 0;
    
    // Remove everything except digits and commas/dots
    const cleaned = cost.replace(/[^\d,.-]/g, '');
    
    // Replace comma with dot for parsing
    const normalized = cleaned.replace(',', '.');
    
    // Parse to number
    const parsed = parseFloat(normalized);
    
    return isNaN(parsed) ? 0 : Math.round(parsed);
  }

  async scrapeAll() {
    try {
      await this.init();
      
      // Projects should be loaded from file before calling this method
      if (this.projects.length === 0) {
        throw new Error('No projects loaded. Call loadProjectsFromFile first.');
      }
      
      this.logger.info(`Starting to scrape ${this.projects.length} projects...`);
      
      const results = [];
      const errors = [];
      
      // Scrape projects with concurrency control
      const promises = this.projects.map((project, index) => 
        this.limit(async () => {
          try {
            this.logger.progress(index + 1, this.projects.length, `Scraping ${project.link}`);
            const details = await this.scrapeProjectDetails(project.link);
            
            if (details) {
              results.push(details);
            } else {
              errors.push({ project, error: 'No details extracted' });
            }
          } catch (error) {
            this.logger.error(`Error scraping ${project.link}:`, error.message);
            errors.push({ project, error: error.message });
          }
        })
      );
      
      await Promise.all(promises);
      
      this.logger.success(`\nScraped ${results.length} projects successfully`);
      if (errors.length > 0) {
        this.logger.warn(`Failed to scrape ${errors.length} projects`);
      }
      
      return results;
      
    } finally {
      await this.cleanup();
    }
  }
}

module.exports = BudgetScraperFromTxt;