# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a civic budget website for Łódź 2025-2026, designed to display projects on an interactive map and list view. The application is built as a static site with Server-Side Rendering at build time, hosted on Vercel.

## Technology Stack

- **Frontend**: HTML + Tailwind CSS + Vanilla JavaScript (ES modules)
- **Map**: Leaflet + OpenStreetMap tiles
- **Street View**: Google Street View Static API via serverless proxy
- **Build Process**: Node.js scripts for data scraping, geocoding, and static HTML generation
- **Hosting**: Vercel (static output + edge function for Street View proxy)
- **Geocoding**: Nominatim (OSM) at build time

## Common Commands

```bash
# Install dependencies
npm install

# Run build pipeline (scrape data, geocode, generate HTML/JSON)
npm run build

# Development server
npm run dev

# Deploy to Vercel
vercel deploy --prod
```

## Architecture

The project uses a static site generation approach:

1. **Data Pipeline**: 
   - Scrapes project data from the civic budget website
   - Geocodes addresses using Nominatim
   - Generates static JSON files and HTML pages

2. **Frontend**: 
   - Two main pages: map view (`index.html`) and list view (`lista.html`)
   - Client-side filtering and sorting
   - Lazy loading for Street View images
   - Query string synchronization for filter state

3. **API**: 
   - Single Vercel Edge Function (`/api/streetview`) proxies Google Street View requests to hide API key

## Key Implementation Details

### Data Model
Projects are stored in `public/data/projekty.json` with fields:
- Basic info: id, nazwa, typ, kategoria, osiedle
- Location: lokalizacjaTekst, lat, lng
- Details: koszt, opis, linkZrodlowy
- Street View parameters: heading, pitch, fov

### UI/UX Requirements
- White-only theme with grayscale palette
- Two-column layout (panel + map on desktop, stacked on mobile)
- Sticky search bar and filters
- Card-based project display with Street View thumbnails
- Responsive design with mobile-first approach

### SEO Optimization
- Static HTML with pre-rendered critical content
- Structured data (JSON-LD) for projects
- Sitemap generation
- Target keywords: "budżet obywatelski łódź mapa"

### Performance Considerations
- No heavy frameworks, minimal JS (~50KB)
- Lazy loading for images and below-fold content
- Edge caching for Street View images (30 days)
- Optional PWA with service worker for asset caching

## Environment Variables

Required for Vercel deployment:
- `GOOGLE_MAPS_API_KEY` - For Street View Static API access