const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const Logger = require('../utils/logger');
const Cache = require('../utils/cache');
const RateLimiter = require('../utils/rateLimiter');

class EnhancedBudgetScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://budzetobywatelski.uml.lodz.pl';
    this.logger = new Logger(options.verbose);
    this.cache = new Cache(path.join(process.cwd(), 'data/.cache/scrape.json'));
    this.rateLimiter = new RateLimiter(options.rateLimit || 1000);
    this.projects = [];
  }

  async scrapeWithCheerio() {
    this.logger.info('Starting enhanced scraping with Cheerio...');
    
    const allProjects = [];
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      try {
        await this.rateLimiter.wait();
        
        // Build URL with page parameter
        const url = `${this.baseUrl}/zlozone-projekty-2026`;
        const params = currentPage > 1 ? `?page=${currentPage}` : '';
        
        this.logger.info(`Fetching page ${currentPage}: ${url}${params}`);
        
        const response = await axios.get(url + params, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract all project links on current page
        const projectLinks = [];
        $('a[href*="szczegoly-projektu"]').each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          
          if (href && text && text !== 'szczegóły projektu') {
            const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
            
            // Extract ID from URL
            const idMatch = fullUrl.match(/szczegoly-projektu-2026-(\d+)-(\d+)-([a-f0-9]+)/);
            let projectId = '';
            if (idMatch) {
              projectId = `P${idMatch[1]}-${idMatch[2]}`;
            }
            
            projectLinks.push({
              url: fullUrl,
              title: text,
              id: projectId
            });
          }
        });
        
        this.logger.info(`Found ${projectLinks.length} projects on page ${currentPage}`);
        
        if (projectLinks.length === 0) {
          // No more projects found
          hasMorePages = false;
        } else {
          allProjects.push(...projectLinks);
          
          // Check for next page
          const nextPageLink = $('a:contains("Następna"), .pagination .next, a[rel="next"]');
          const lastPageLink = $('a:contains("Ostatnia"), .pagination .last');
          
          if (nextPageLink.length > 0 && !nextPageLink.hasClass('disabled')) {
            currentPage++;
          } else {
            hasMorePages = false;
          }
          
          // Safety limit
          if (currentPage > 50) {
            this.logger.info('Reached page limit (50), stopping pagination');
            hasMorePages = false;
          }
        }
        
      } catch (error) {
        this.logger.error(`Error fetching page ${currentPage}:`, error.message);
        hasMorePages = false;
      }
    }
    
    // Remove duplicates
    const uniqueProjects = Array.from(
      new Map(allProjects.map(p => [p.url, p])).values()
    );
    
    this.logger.success(`Total unique projects found: ${uniqueProjects.length}`);
    return uniqueProjects;
  }

  async scrapeProjectDetails(projectUrl) {
    // Check cache
    if (this.cache.has(projectUrl)) {
      this.logger.debug(`Using cached data for ${projectUrl}`);
      return this.cache.get(projectUrl);
    }
    
    await this.rateLimiter.wait();
    
    try {
      this.logger.debug(`Fetching details from ${projectUrl}`);
      
      const response = await axios.get(projectUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const project = {};
      
      // Extract ID from URL
      const idMatch = projectUrl.match(/szczegoly-projektu-2026-(\d+)-(\d+)-([a-f0-9]+)/);
      if (idMatch) {
        project.id = `P${idMatch[1]}-${idMatch[2]}`;
      }
      
      // Look for title
      project.nazwa = $('h1').first().text().trim() || 
                     $('h2').first().text().trim() ||
                     $('.project-title, .page-title').first().text().trim();
      
      // Clean title - remove "Łódzki Budżet Obywatelski" if it's the only content
      if (project.nazwa === 'Łódzki Budżet Obywatelski 2025/2026') {
        project.nazwa = $('h2').eq(1).text().trim() || $('h3').first().text().trim();
      }
      
      // Extract structured data
      const dataRows = $('.row .col-md-3, .detail-label, dt, .field-label');
      dataRows.each((i, el) => {
        const label = $(el).text().toLowerCase().trim();
        const valueEl = $(el).next();
        const value = valueEl.text().trim();
        
        if (label.includes('typ') && !label.includes('tytuł')) {
          project.typ = value;
        } else if (label.includes('kategoria')) {
          project.kategoria = value;
        } else if (label.includes('osiedle') || label.includes('dzielnica')) {
          project.osiedle = value;
        } else if (label.includes('lokalizacja') || label.includes('miejsce')) {
          project.lokalizacjaTekst = value;
        } else if (label.includes('koszt') || label.includes('szacunkowy') || label.includes('budżet')) {
          project.koszt = value;
        } else if (label.includes('numer') && !project.id) {
          project.id = value;
        }
      });
      
      // Look for description in various places
      project.opis = $('.project-description, .opis-projektu, .description').first().text().trim() ||
                    $('p').filter((i, el) => $(el).text().length > 100).first().text().trim() ||
                    '';
      
      // Look for cost in text if not found
      if (!project.koszt) {
        const costPattern = /(\d[\d\s]*(?:,\d{2})?\s*(?:zł|PLN|złotych))/gi;
        const pageText = $('body').text();
        const costMatch = pageText.match(costPattern);
        if (costMatch) {
          project.koszt = costMatch[0];
        }
      }
      
      // Normalize data
      const normalized = this.normalizeProject(project);
      normalized.linkZrodlowy = projectUrl;
      
      // Cache result
      this.cache.set(projectUrl, normalized);
      this.logger.stats.scraped++;
      
      return normalized;
      
    } catch (error) {
      this.logger.error(`Failed to scrape ${projectUrl}:`, error.message);
      this.logger.stats.failed++;
      return null;
    }
  }

  normalizeProject(raw) {
    return {
      id: raw.id?.trim() || '',
      nazwa: this.cleanText(raw.nazwa || ''),
      typ: this.normalizeType(raw.typ),
      kategoria: this.cleanText(raw.kategoria || ''),
      osiedle: this.cleanText(raw.osiedle || ''),
      lokalizacjaTekst: this.cleanText(raw.lokalizacjaTekst || ''),
      koszt: this.parseCost(raw.koszt),
      opis: this.cleanText(raw.opis || ''),
      dataPobrania: new Date().toISOString()
    };
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n+/g, ' ')
      .trim();
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
    
    // Remove all non-digit characters
    const cleaned = costString.toString().replace(/[^\d]/g, '');
    return parseInt(cleaned || '0', 10);
  }

  async scrapeAll() {
    try {
      // Step 1: Get all project links
      const projectList = await this.scrapeWithCheerio();
      
      if (projectList.length === 0) {
        this.logger.error('No projects found');
        return [];
      }
      
      // Step 2: Scrape details for each project
      this.logger.info(`\nStarting to scrape details for ${projectList.length} projects...`);
      
      const projects = [];
      for (let i = 0; i < projectList.length; i++) {
        const project = projectList[i];
        this.logger.progress(i + 1, projectList.length, `Scraping: ${project.title.substring(0, 50)}...`);
        
        const details = await this.scrapeProjectDetails(project.url);
        if (details) {
          // Use scraped title if better than link text
          if (!details.nazwa || details.nazwa === 'Łódzki Budżet Obywatelski 2025/2026') {
            details.nazwa = project.title;
          }
          projects.push(details);
        }
        
        // Save progress every 10 projects
        if ((i + 1) % 10 === 0) {
          const progressFile = path.join(process.cwd(), 'data/.cache/progress.json');
          await fs.writeJson(progressFile, {
            completed: i + 1,
            total: projectList.length,
            projects: projects
          });
        }
      }
      
      this.logger.success(`\nSuccessfully scraped ${projects.length} projects`);
      this.logger.printStats();
      
      return projects;
      
    } catch (error) {
      this.logger.error('Fatal error during scraping:', error);
      throw error;
    }
  }
}

module.exports = EnhancedBudgetScraper;