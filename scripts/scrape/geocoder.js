const axios = require('axios');
const Cache = require('../utils/cache');
const RateLimiter = require('../utils/rateLimiter');
const path = require('path');

class Geocoder {
  constructor(options = {}) {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.cache = new Cache(path.join(process.cwd(), 'data/.cache/geocode.json'));
    this.rateLimiter = new RateLimiter(1000); // OSM requires 1 req/sec
    this.defaultCity = 'Łódź';
    this.defaultCountry = 'Poland';
    this.email = options.email || 'admin@budzetobywatelski.pl';
    this.verbose = options.verbose || false;
  }

  async geocodeAddress(address) {
    if (!address) return null;
    
    // Normalize address for cache key
    const normalizedAddress = this.normalizeAddress(address);
    const cacheKey = `${normalizedAddress}, ${this.defaultCity}, ${this.defaultCountry}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      if (this.verbose) console.log(`[GEOCODE] Using cached result for: ${cacheKey}`);
      return this.cache.get(cacheKey);
    }
    
    // Rate limiting
    await this.rateLimiter.wait();
    
    try {
      // Build query
      const query = this.buildQuery(normalizedAddress);
      
      if (this.verbose) console.log(`[GEOCODE] Querying: ${query}`);
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          countrycodes: 'pl',
          viewbox: '19.2,51.6,19.7,51.9', // Łódź bounding box
          bounded: 0
        },
        headers: {
          'User-Agent': `BudzetObywatelskiScraper/1.0 (${this.email})`
        },
        timeout: 10000
      });
      
      if (response.data && response.data.length > 0) {
        const result = {
          lat: parseFloat(response.data[0].lat),
          lng: parseFloat(response.data[0].lon),
          display_name: response.data[0].display_name,
          confidence: parseFloat(response.data[0].importance || 0.5),
          timestamp: new Date().toISOString()
        };
        
        // Validate coordinates are within Łódź area
        if (this.isWithinLodz(result.lat, result.lng)) {
          this.cache.set(cacheKey, result);
          return result;
        } else {
          console.warn(`[GEOCODE] Coordinates outside Łódź for: ${address}`);
          // Try with more specific query
          return await this.geocodeWithFallback(normalizedAddress);
        }
      }
      
      // No results, try fallback
      return await this.geocodeWithFallback(normalizedAddress);
      
    } catch (error) {
      console.error(`[GEOCODE] Error geocoding ${address}:`, error.message);
      return null;
    }
  }

  async geocodeWithFallback(address) {
    // Try with just district/osiedle name
    const districtMatch = address.match(/(?:osiedle|dzielnica)\s+([^,;]+)/i);
    if (districtMatch) {
      const district = districtMatch[1].trim();
      return await this.geocodeAddress(district);
    }
    
    // Try with street name only
    const streetMatch = address.match(/(?:ul\.|ulica)\s+([^,;]+)/i);
    if (streetMatch) {
      const street = streetMatch[1].trim();
      return await this.geocodeAddress(`ulica ${street}`);
    }
    
    // Last resort - return city center
    return {
      lat: 51.7592,
      lng: 19.4560,
      display_name: 'Łódź, Poland (City Center - Fallback)',
      confidence: 0.1,
      timestamp: new Date().toISOString()
    };
  }

  normalizeAddress(address) {
    let normalized = address.trim();
    
    // Expand abbreviations
    normalized = normalized.replace(/\bul\./gi, 'ulica');
    normalized = normalized.replace(/\bal\./gi, 'aleja');
    normalized = normalized.replace(/\bpl\./gi, 'plac');
    normalized = normalized.replace(/\bos\./gi, 'osiedle');
    
    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Remove special characters except Polish letters
    normalized = normalized.replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-,]/gi, '');
    
    return normalized;
  }

  buildQuery(address) {
    // Check if address already contains city
    if (address.toLowerCase().includes('łódź')) {
      return `${address}, ${this.defaultCountry}`;
    }
    
    return `${address}, ${this.defaultCity}, ${this.defaultCountry}`;
  }

  isWithinLodz(lat, lng) {
    // Rough bounding box for Łódź
    return lat >= 51.6 && lat <= 51.9 && lng >= 19.2 && lng <= 19.7;
  }

  async geocodeProjects(projects) {
    console.log(`[GEOCODE] Starting geocoding for ${projects.length} projects...`);
    
    let geocoded = 0;
    let failed = 0;
    
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      
      console.log(`[GEOCODE] Progress: ${i + 1}/${projects.length} - ${project.nazwa || project.id}`);
      
      if (project.lokalizacjaTekst) {
        const result = await this.geocodeAddress(project.lokalizacjaTekst);
        
        if (result) {
          project.lat = result.lat;
          project.lng = result.lng;
          project.statusGeokodowania = 'success';
          project.geocodeConfidence = result.confidence;
          
          // Add Google Maps link
          project.linkGoogleMaps = `https://www.google.com/maps?q=${result.lat},${result.lng}`;
          
          // Add Street View parameters
          project.streetView = {
            heading: 0,
            pitch: 0,
            fov: 90
          };
          
          geocoded++;
        } else {
          project.statusGeokodowania = 'failed';
          failed++;
        }
      } else {
        project.statusGeokodowania = 'no_address';
        failed++;
      }
    }
    
    console.log(`[GEOCODE] Completed: ${geocoded} geocoded, ${failed} failed`);
    
    return projects;
  }
}

module.exports = Geocoder;