# TXT-based Scraping

This directory contains scripts to scrape project details from URLs listed in a TXT file, instead of scraping the main project listing page.

## Usage

1. **Prepare the URL list**: Create or edit `data/project-urls.txt` with project URLs:
   ```
   # Project URLs for scraping
   # One URL per line, comments start with #
   
   https://budzetobywatelski.uml.lodz.pl/szczegoly-projektu-2026-1-nazwa-projektu
   https://budzetobywatelski.uml.lodz.pl/szczegoly-projektu-2026-2-inny-projekt
   /szczegoly-projektu-2026-3-kolejny-projekt
   szczegoly-projektu-2026-4-jeszcze-inny
   ```

2. **Run the scraper**:
   ```bash
   # Basic scraping
   npm run scrape:txt
   
   # Verbose output
   npm run scrape:txt:verbose
   
   # Custom TXT file
   node scripts/scrape/index-txt.js path/to/custom-urls.txt
   ```

## Features

- **TXT file input**: Reads URLs from a simple text file
- **Flexible URL formats**: Supports absolute URLs, relative paths, and domain-relative paths
- **Comments**: Lines starting with `#` are ignored
- **Same output format**: Generates the same JSON and GeoJSON files as the original scraper
- **Caching**: Uses the same caching mechanism to avoid re-scraping
- **Geocoding**: Includes the same geocoding pipeline

## Output Files

- `data/projekty-raw.json` - Raw scraped data
- `data/projekty.json` - Final processed data with metadata
- `data/projekty.geo.json` - GeoJSON format for mapping

## Migration from Web Scraping

The TXT-based approach produces the same output format, so you can switch between methods without changing your frontend code. Simply replace:

```bash
npm run scrape        # Old: scrapes web pages
npm run scrape:txt    # New: scrapes from TXT file
```