class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
    this.stats = {
      scraped: 0,
      failed: 0,
      geocoded: 0,
      geocodeFailed: 0
    };
  }

  info(message) {
    console.log(`[INFO] ${message}`);
  }

  success(message) {
    console.log(`[SUCCESS] ${message}`);
  }

  error(message, error = null) {
    console.error(`[ERROR] ${message}`);
    if (error && this.verbose) {
      console.error(error);
    }
  }

  debug(message) {
    if (this.verbose) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  progress(current, total, message = '') {
    const percentage = Math.round((current / total) * 100);
    console.log(`[PROGRESS] ${current}/${total} (${percentage}%) ${message}`);
  }

  printStats() {
    console.log('\n=== Scraping Statistics ===');
    console.log(`Projects scraped: ${this.stats.scraped}`);
    console.log(`Failed scraping: ${this.stats.failed}`);
    console.log(`Geocoded: ${this.stats.geocoded}`);
    console.log(`Geocoding failed: ${this.stats.geocodeFailed}`);
  }
}

module.exports = Logger;