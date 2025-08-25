# 📋 Implementation Plan - Łódź Civic Budget Website

**Project**: Budżet Obywatelski Łódź 2025-2026 - Interactive Map & List  
**Generated**: 2025-08-25  
**Status**: Ready for Implementation  

## 🏗️ Current Status Analysis

### ✅ COMPLETED:
- ✅ **Data scraping system** - TXT-based scraper with coordinate extraction
- ✅ **968 projects** scraped with precise coordinates from map widgets
- ✅ **Data files generated**: `projekty.json` (1.2MB), `projekty.geo.json` (1.3MB), `projekty-raw.json` (1.2MB)
- ✅ **Build pipeline foundation** - scraping and data processing scripts
- ✅ **Coordinate accuracy verified** - Direct extraction from official map widgets

### ❌ MISSING (to implement):
- ❌ Frontend HTML/CSS/JS files
- ❌ Vercel configuration and API proxy
- ❌ Static site generation scripts
- ❌ SEO optimization and meta generation

---

## 🎯 Phase-Based Implementation Plan

### **Phase 1: Core Infrastructure & Build System** 
*Estimated: 1-2 days*

#### 1.1 Project Structure Setup
```
public/
├─ index.html                 # Map page
├─ lista.html                 # List page  
├─ assets/
│  ├─ styles.css              # Tailwind CSS + custom styles
│  ├─ logo.svg               # Łódź logo
│  ├─ icons.svg              # UI icons (search, filter, pin)
│  └─ favicon.ico
├─ data/                      # ✅ Already exists with projects data
│  ├─ projekty.json          # ✅ Main data file (968 projects)
│  ├─ projekty.geo.json      # ✅ GeoJSON for mapping (967 features)
│  └─ projekty-raw.json      # ✅ Raw scraped data
├─ banner/
│  └─ banner.html            # Admin customizable banner
├─ projekty/                 # Generated project detail pages
│  └─ {id}.html             # Individual project pages (SEO)
├─ sitemap.xml
├─ robots.txt
└─ manifest.webmanifest

api/
└─ streetview.js             # Vercel Edge Function for Google Street View

src/
├─ map.js                    # Map functionality (Leaflet + OSM)
├─ list.js                   # List functionality 
├─ filters.js                # Shared filtering logic
└─ utils.js                  # Helper functions

scripts/
├─ build.js                  # Main build orchestrator
└─ generate/
   ├─ html.js                # HTML generator
   ├─ seo.js                 # SEO & meta generator
   └─ sitemap.js             # Sitemap generator

vercel.json                  # Vercel deployment config
```

#### 1.2 Package.json Updates
- ✅ Add build scripts: `build`, `dev`, `deploy`
- ✅ Add dependencies: `tailwindcss`, build tools
- ✅ Configure Vercel deployment

#### 1.3 Build System Development
- ✅ `scripts/build.js` - Main orchestrator
- ✅ HTML generation system for static pages
- ✅ SEO meta generation (title, description, JSON-LD)
- ✅ Asset processing and optimization

### **Phase 2: Vercel API & Street View Proxy**
*Estimated: 0.5 days*

#### 2.1 Street View API Proxy (`api/streetview.js`)
```javascript
// Edge Function for Google Street View Static API
// URL: /api/streetview?lat=51.7889&lng=19.4596&size=640x360&heading=0&pitch=0&fov=90
// Features:
// - Hide Google API key from frontend
// - 30-day caching headers
// - Error handling for missing panoramas
// - Image passthrough with proper headers
```

#### 2.2 Vercel Configuration (`vercel.json`)
```json
{
  "functions": {
    "api/streetview.js": {
      "runtime": "edge"
    }
  },
  "headers": [
    {
      "source": "/api/streetview",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=2592000, stale-while-revalidate=86400"
        }
      ]
    }
  ]
}
```

### **Phase 3: Frontend Core - Map Page (`index.html`)**
*Estimated: 1-2 days*

#### 3.1 Map Implementation
- ✅ **Leaflet integration** with OpenStreetMap tiles
- ✅ **Tile selection**: CartoDB Positron (light, minimal) for white-only theme
- ✅ **GeoJSON loading**: Load `projekty.geo.json` (967 projects with coordinates)
- ✅ **Custom markers**: White pins with gray borders, monochrome design
- ✅ **Marker clustering**: Leaflet.markercluster for performance

#### 3.2 Map Popup System
```javascript
// Popup features:
// - Project title (H3, semibold)
// - District and category
// - Cost (formatted: "250 000 zł")
// - Short description (2 lines)
// - Action buttons:
//   - "Zobacz szczegóły" → /lista.html#B001BD
//   - "Otwórz w Google Maps" → external link
```

#### 3.3 Filter Panel (Left Column 420-480px)
- ✅ **Search bar**: Debounced search (250ms), ESC to clear
- ✅ **Category filters**: Multi-select checkboxes (chip display)
- ✅ **Type filters**: Radio buttons (osiedlowe/ponadosiedlowe/ogólnomiejski)
- ✅ **District filters**: Multi-select dropdown
- ✅ **Cost range**: Min/max number inputs
- ✅ **Filter state**: URL synchronization, localStorage persistence

#### 3.4 Layout & Responsiveness
- ✅ **Desktop**: Two-column (panel 420px + map fill)
- ✅ **Tablet**: Two-column (panel 380px + map fill) 
- ✅ **Mobile**: Stacked (panel top + map bottom 60vh)
- ✅ **White-only theme**: Backgrounds #FFFFFF/#F7F7F7, text #111/#333/#6B6B6B

### **Phase 4: Frontend Core - List Page (`lista.html`)**
*Estimated: 1-2 days*

#### 4.1 Project Cards System
```javascript
// ProjectCard component features:
// - Street View thumbnail (16:9, lazy loaded)
// - Title (H3, semibold, #111)
// - Address/district (#6B6B6B)
// - Category/type/district chips
// - Cost (prominent display)
// - Description (2-3 lines, ellipsis)
// - Action buttons:
//   - "Pokaż na mapie" → index.html?id=B001BD
//   - "Google Maps" → external
//   - "Menu" (3 dots) → more options
```

#### 4.2 Street View Integration
```javascript
// Street View thumbnails:
// URL: /api/streetview?lat={lat}&lng={lng}&size=320x180&fov=90&heading=0&pitch=0
// Features:
// - Lazy loading with intersection observer
// - Blur placeholder while loading
// - Error fallback: neutral SVG placeholder
// - Alt text: "Zdjęcie miejsca (Street View) – {nazwa projektu}"
```

#### 4.3 Advanced Features
- ✅ **Sorting**: Cost (asc/desc), name A-Z, district A-Z
- ✅ **Virtualization**: Handle 968 projects efficiently
- ✅ **Search**: Full-text across name, description, location
- ✅ **Deep linking**: `/lista.html#B001BD` focuses specific project
- ✅ **Filter persistence**: Sync with map page filters

### **Phase 5: SEO & Performance Optimization**
*Estimated: 1 day*

#### 5.1 SEO Implementation
- ✅ **Static HTML pre-rendering**: Critical content visible without JS
- ✅ **Individual project pages**: `/projekty/{id}.html` for each project
- ✅ **JSON-LD structured data**:
  ```json
  {
    "@type": "ItemList",
    "name": "Budżet Obywatelski Łódź 2025-2026",
    "description": "968 projektów budżetu obywatelskiego",
    "areaServed": "Łódź",
    "itemListElement": [...]
  }
  ```

#### 5.2 Meta Tags & Keywords
```html
<!-- Target keywords -->
<title>Budżet Obywatelski Łódź – mapa projektów 2025/2026</title>
<meta name="description" content="Interaktywna mapa i lista 968 projektów BO Łódź 2025/2026. Filtruj po kategoriach, osiedlach i kosztach. Zobacz lokalizacje na mapie i Street View.">
<meta name="keywords" content="budżet obywatelski łódź mapa, budżet obywatelski 2025 łódź, bo łódź 2026, mapa projektów łódź, lbo łódź mapa">
```

#### 5.3 Performance Optimization
- ✅ **Bundle size target**: <50KB JavaScript total
- ✅ **Asset optimization**: Minification, compression
- ✅ **Image lazy loading**: Street View thumbnails, icons
- ✅ **Progressive enhancement**: Works without JS for basic content
- ✅ **Lighthouse target**: Performance ≥90

### **Phase 6: Final Polish & Testing**
*Estimated: 1 day*

#### 6.1 Admin Banner System
```html
<!-- /banner/banner.html -->
<div class="admin-banner">
  <p>Administrator może tutaj umieścić własny banner HTML.</p>
  <p>Ten plik można edytować bezpośrednio na serwerze.</p>
</div>
```

#### 6.2 Accessibility (WCAG 2.1 AA)
- ✅ **Keyboard navigation**: Logical tab order
- ✅ **Screen reader support**: ARIA labels, semantic HTML
- ✅ **Color contrast**: 4.5:1 minimum for all text
- ✅ **Focus indicators**: Visible outline on interactive elements
- ✅ **Alt text**: Descriptive text for all images

#### 6.3 Cross-browser Testing
- ✅ **Desktop**: Chrome, Firefox, Safari, Edge
- ✅ **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- ✅ **Performance**: Lighthouse audits on all target devices
- ✅ **Functionality**: All features work across browsers

---

## 🚀 Development Priority Matrix

### **CRITICAL PATH** (Must complete first):
1. **Build system** (`scripts/build.js`)
2. **Basic HTML pages** (`index.html`, `lista.html`)
3. **CSS framework** (Tailwind + custom styles)
4. **Map integration** (Leaflet + OpenStreetMap)
5. **Street View proxy** (`api/streetview.js`)

### **HIGH PRIORITY**:
- ✅ Project filtering and search functionality
- ✅ Responsive design implementation
- ✅ Street View thumbnail integration
- ✅ Cross-page navigation and deep linking

### **MEDIUM PRIORITY**:
- ✅ SEO optimization and meta tags
- ✅ Performance optimization
- ✅ Individual project detail pages

### **LOW PRIORITY** (post-MVP):
- ✅ PWA features (service worker, offline)
- ✅ Advanced analytics integration
- ✅ Admin dashboard for banner management

---

## 📊 Technical Specifications

### **Technology Stack**:
- **Frontend**: Vanilla HTML/CSS/JS (ES modules)
- **Styling**: Tailwind CSS + custom CSS variables
- **Map**: Leaflet 1.9+ + OpenStreetMap tiles (CartoDB Positron)
- **API**: Google Street View Static API (proxied via Vercel)
- **Build**: Node.js scripts with fs-extra, cheerio
- **Hosting**: Vercel (static site + 1 Edge Function)
- **Data**: Static JSON files (no database)

### **Performance Targets**:
- **JavaScript bundle**: <50KB minified
- **CSS bundle**: <30KB minified  
- **Lighthouse Performance**: ≥90
- **First Contentful Paint**: <2s
- **Largest Contentful Paint**: <2.5s
- **Time to Interactive**: <3s on mobile

### **Browser Support**:
- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Fallbacks**: Graceful degradation for older browsers

### **Data Structure Confirmed**:
```json
{
  "id": "B001BD",
  "nazwa": "Cywilizacja parkowania na Starych Bałutach",
  "typ": "osiedlowe",
  "kategoria": "Infrastruktura drogowa i komunikacja", 
  "osiedle": "Bałuty-Doły",
  "lokalizacjaTekst": "",
  "koszt": 80000,
  "opis": "Zadanie polega na ustawieniu słupków lub barier...",
  "statusGeokodowania": "success",
  "lat": 51.7888995468,
  "lng": 19.4595682988,
  "heading": 0,
  "pitch": 0,
  "fov": 90,
  "linkZrodlowy": "https://budzetobywatelski.uml.lodz.pl/..."
}
```

---

## 🎨 UI/UX Design System (White-Only Theme)

### **Color Palette**:
```css
:root {
  /* Backgrounds */
  --bg-primary: #FFFFFF;
  --bg-secondary: #FAFAFA;
  --bg-tertiary: #F7F7F7;
  --bg-hover: #F2F2F2;
  
  /* Text */
  --text-primary: #111111;
  --text-secondary: #333333;
  --text-tertiary: #6B6B6B;
  
  /* Borders */
  --border-default: #E6E6E6;
  --border-hover: #DADADA;
  --border-active: #CFCFCF;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.15);
}
```

### **Typography**:
```css
/* Font: Inter or system-ui */
--font-family: Inter, system-ui, -apple-system, sans-serif;

/* Sizes */
--text-xs: 12px;    /* Labels */
--text-sm: 14px;    /* Body secondary */
--text-base: 16px;  /* Body primary */
--text-lg: 18px;    /* Card titles */
--text-xl: 20px;    /* Page headings */
--text-2xl: 24px;   /* Main title */

/* Line heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### **Components**:
- **SearchBar**: 44px height, 12px radius, icon left, clear button
- **FilterButton**: Chip style, toggle states, count badges
- **ProjectCard**: White background, subtle shadow, 16px radius
- **MapMarker**: White pin with gray border, hover states
- **Popup**: White card, shadow, action buttons

---

## 📋 Implementation Checklist

### **Phase 1: Infrastructure**
- [ ] Create project directory structure
- [ ] Set up build system (`scripts/build.js`)
- [ ] Configure Tailwind CSS
- [ ] Create basic HTML templates
- [ ] Set up Vercel configuration

### **Phase 2: API**
- [ ] Implement Street View proxy (`api/streetview.js`)
- [ ] Test API with sample coordinates
- [ ] Configure caching headers
- [ ] Handle error cases (no panorama)

### **Phase 3: Map Page**
- [ ] Integrate Leaflet with OpenStreetMap
- [ ] Load and display GeoJSON data (967 projects)
- [ ] Implement custom markers and popups
- [ ] Create filter panel UI
- [ ] Implement filter logic and URL sync
- [ ] Add responsive layout

### **Phase 4: List Page** 
- [ ] Create project card component
- [ ] Integrate Street View thumbnails
- [ ] Implement search and sorting
- [ ] Add pagination/virtualization
- [ ] Create filter synchronization
- [ ] Add "Show on map" functionality

### **Phase 5: SEO**
- [ ] Generate individual project pages
- [ ] Implement JSON-LD structured data
- [ ] Create sitemap.xml
- [ ] Optimize meta tags for target keywords
- [ ] Add OpenGraph/Twitter cards

### **Phase 6: Polish**
- [ ] Implement banner system
- [ ] Accessibility testing and fixes
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Deploy to Vercel production

---

## 🚀 Ready to Start Implementation!

The data foundation is solid with **968 projects** and **precise coordinates**. The plan is comprehensive and ready for execution. 

**Recommended starting point**: Phase 1.1 - Project Structure Setup

**Estimated total time**: 5-7 days for full implementation
**MVP delivery**: 3-4 days (core functionality)