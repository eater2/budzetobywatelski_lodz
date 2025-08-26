const fs = require('fs-extra');
const path = require('path');

class HTMLGenerator {
  static generateBaseHTML(title, description, content, additionalHead = '', bodyClass = '') {
    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="budżet obywatelski łódź mapa, budżet obywatelski 2025 łódź, bo łódź 2026, mapa projektów łódź, lbo łódź mapa, głosowanie obywatelskie łódź, projekty mieszkańców łódź, budżet partycypacyjny łódź, inicjatywy lokalne łódź">
  
  <!-- SEO Enhancement -->
  <meta name="author" content="Budżet Obywatelski Łódź">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="language" content="Polish">
  <meta name="geo.region" content="PL-LD">
  <meta name="geo.placename" content="Łódź">
  <meta name="geo.position" content="51.7592485;19.4559833">
  <meta name="ICBM" content="51.7592485, 19.4559833">
  <link rel="canonical" href="https://budzetobywatelski-lodz.vercel.app/">
  
  <!-- OpenGraph Enhanced -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://budzetobywatelski-lodz.vercel.app/">
  <meta property="og:site_name" content="Budżet Obywatelski Łódź">
  <meta property="og:locale" content="pl_PL">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="article:author" content="Budżet Obywatelski Łódź">
  <meta property="article:section" content="Civic Engagement">
  <meta property="article:tag" content="budżet obywatelski">
  <meta property="article:tag" content="Łódź">
  <meta property="article:tag" content="demokracja">
  <meta property="article:tag" content="projekty lokalne">
  
  <!-- Twitter Enhanced -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:site" content="@LodzOfficial">
  <meta name="twitter:creator" content="@LodzOfficial">
  
  <!-- Icons -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.webmanifest">
  
  <!-- Preload critical resources -->
  <link rel="preload" href="/data/projekty.json" as="fetch" crossorigin="anonymous">
  <link rel="preload" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" as="style" crossorigin="anonymous">
  
  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="anonymous">
  
  <!-- Tailwind CSS (CDN for now - will be replaced with custom build) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#FFFFFF',
            secondary: '#FAFAFA', 
            tertiary: '#F7F7F7',
            hover: '#F2F2F2',
            'text-primary': '#111111',
            'text-secondary': '#333333',
            'text-tertiary': '#6B6B6B',
            'border-default': '#E6E6E6',
            'border-hover': '#DADADA',
            'border-active': '#CFCFCF'
          },
          aspectRatio: {
            '16/9': '16 / 9'
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
          }
        }
      }
    }
  </script>
  
  <!-- Leaflet JS -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  
  <!-- Custom styles -->
  <style>
    body { font-family: Inter, system-ui, -apple-system, sans-serif; }
    .shadow-custom { box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .shadow-custom-md { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .shadow-custom-lg { box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    
    /* Ensure map container has proper dimensions and interactions */
    #map {
      position: relative !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 1 !important;
    }
    
    /* Leaflet map fixes for proper mouse interaction */
    .leaflet-container {
      cursor: grab;
    }
    
    .leaflet-container:active {
      cursor: grabbing;
    }
    
    .leaflet-container a {
      color: inherit;
    }
    
    .leaflet-control-zoom {
      z-index: 1000 !important;
    }
    
    /* Fix for potential CSS conflicts */
    .leaflet-container .leaflet-marker-pane img,
    .leaflet-container .leaflet-zoom-animated {
      pointer-events: auto;
    }
    
    /* Tailwind CSS reset conflicts fix */
    .leaflet-container * {
      box-sizing: content-box;
    }
    
    .leaflet-container .leaflet-control {
      box-sizing: border-box;
    }
    
    /* Ensure map interactions work properly */
    .leaflet-container {
      touch-action: pan-x pan-y;
    }
  </style>
  
  ${additionalHead}
</head>
<body class="${bodyClass}">
${content}

</body>
</html>`;
  }

  static async generateMapPage(data, publicDir) {
    const title = 'Budżet Obywatelski Łódź – mapa projektów 2025/2026';
    const description = 'Interaktywna mapa projektów budżetu obywatelskiego Łodzi 2025/2026. Zobacz lokalizacje wszystkich projektów na mapie, filtruj po kategoriach i osiedlach.';
    
    const projectCount = data.projects?.length || 0;
    const geoCount = data.metadata?.geocoded || 0;
    
    const content = `
<!-- Header -->
<header class="bg-primary border-b border-border-default h-[10vh] md:h-[12vh] lg:h-[12vh] mt-2 md:mt-0">
  <div class="container mx-auto px-4 h-full flex items-center">
    <div class="flex items-center justify-between w-full">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-text-primary">Budżet Obywatelski Łódź</h1>
        <p class="text-sm md:text-base text-text-tertiary">2025–2026 • ${projectCount} projektów • Mapa</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="filter-toggle" class="flex items-center gap-2 px-3 py-2 bg-tertiary hover:bg-hover border border-border-default rounded-lg text-text-secondary hover:text-text-primary transition-colors md:hidden">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <span class="text-sm">Filtry</span>
        </button>
        <button id="filter-toggle-desktop" class="flex items-center gap-2 px-3 py-2 bg-tertiary hover:bg-hover border border-border-default rounded-lg text-text-secondary hover:text-text-primary transition-colors hidden md:block">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <span class="text-sm">Filtry</span>
        </button>
      </div>
    </div>
  </div>
</header>

<!-- Main Layout Container -->
<div id="main-layout" class="flex flex-col md:flex-row relative mt-1 min-h-screen" style="height: calc(100vh - 10vh - 0.75rem);">
  <style>
    @media (min-width: 768px) {
      #main-layout { height: calc(100vh - 12vh - 0.25rem); }
    }
    @media (max-width: 767px) {
      #main-layout { 
        height: auto; 
        min-height: calc(100vh - 10vh - 0.75rem); 
      }
    }
  </style>
  
  <!-- Filter Panel Expand Button (always in DOM, shown when collapsed) -->
  <button id="filter-panel-expand" class="hidden md:hidden absolute left-0 top-20 bg-primary border border-border-default border-l-0 rounded-r-md px-1 py-3 hover:bg-hover transition-colors z-30">
    <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
    </svg>
  </button>
  
  <!-- Left Filter Panel (Collapsible) -->
  <div id="filter-panel" class="absolute md:relative z-20 bg-primary border-r border-border-default flex flex-col overflow-hidden transition-all duration-300 transform -translate-x-full md:translate-x-0 h-full md:w-96" data-collapsed="false">
    <!-- Search Bar -->
    <div class="p-4 border-b border-border-default">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-text-primary">Filtry</h3>
        <div class="flex items-center gap-2">
          <button id="close-filter" class="md:hidden text-text-tertiary hover:text-text-primary">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <button id="filter-panel-toggle" class="hidden md:block p-1 hover:bg-hover rounded transition-colors">
            <svg id="filter-collapse-icon" class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="relative">
        <input 
          id="search-input"
          type="search" 
          placeholder="Wyszukaj projekt lub miejsce..." 
          class="w-full pl-10 pr-4 py-3 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-border-active"
        >
        <svg class="absolute left-3 top-3.5 h-4 w-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
    </div>
    
    <!-- Filters -->
    <div class="p-4 border-b border-border-default">
      <!-- Category Filter -->
      <div class="mb-3">
        <label class="block text-sm font-medium text-text-secondary mb-2">Kategoria</label>
        <select id="category-filter" class="w-full p-2 border border-border-default rounded-lg">
          <option value="">Wszystkie kategorie</option>
        </select>
      </div>
      
      <!-- District Filter -->
      <div class="mb-3">
        <label class="block text-sm font-medium text-text-secondary mb-2">Osiedle</label>
        <select id="district-filter" class="w-full p-2 border border-border-default rounded-lg">
          <option value="">Wszystkie osiedla</option>
        </select>
      </div>
      
      <!-- Clear Filters Button -->
      <button id="clear-filters" class="w-full px-3 py-2 text-sm bg-tertiary hover:bg-hover border border-border-default rounded-lg text-text-secondary hover:text-text-primary transition-colors">
        Wyczyść filtry
      </button>
    </div>
  </div>

  <!-- Overlay for mobile -->
  <div id="filter-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-10 hidden md:hidden"></div>
  
  <!-- Main Content Area -->
  <div class="flex-1 flex flex-col md:flex-col">
    <!-- Map Container - Fixed 60% height on mobile, 40% on desktop -->
    <div id="map-container" class="h-[60vh] md:h-[40%] relative transition-all duration-300 flex-shrink-0">
      <div id="map" class="w-full h-full"></div>
      
      <!-- Map Loading -->
      <div id="mapLoading" class="absolute inset-0 bg-primary bg-opacity-90 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-text-tertiary mb-4"></div>
          <p class="text-text-secondary">Ładowanie mapy...</p>
        </div>
      </div>
    </div>
    
    <!-- Project List - Scrollable on mobile, 60% on desktop -->
    <div id="projects-panel" class="flex-1 md:h-[60%] bg-primary border-t border-border-default overflow-hidden flex flex-col transition-all duration-300 relative" data-collapsed="false">
      <div id="projects-header" class="p-4 border-b border-border-default sticky top-0 bg-primary z-10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-text-primary">Projekty <span id="results-count" class="text-text-tertiary">(${projectCount})</span></h3>
            <button id="projects-panel-toggle" class="hidden md:block p-1 hover:bg-hover rounded transition-colors">
              <svg id="projects-collapse-icon" class="w-5 h-5 text-text-secondary transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
          <select id="sort-filter" class="px-3 py-2 border border-border-default rounded-lg text-sm">
            <option value="name">Nazwa A-Z</option>
            <option value="cost-desc">Koszt malejąco</option>
            <option value="cost-asc">Koszt rosnąco</option>
            <option value="district">Osiedle A-Z</option>
          </select>
        </div>
      </div>
      
      <!-- Project cards container -->
      <div class="flex-1 overflow-y-auto p-4 min-h-[50vh] md:min-h-0">
        <div id="project-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
          <div class="col-span-full text-center text-text-tertiary py-8">
            <p>Ładowanie projektów...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Footer -->
<footer class="bg-tertiary border-t border-border-default mt-8">
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <!-- Left side - Repository and date -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 text-sm text-text-secondary">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <a 
            href="https://github.com/eater2/budzetobywatelski_lodz" 
            target="_blank" 
            rel="noopener noreferrer"
            class="hover:text-text-primary underline"
          >
            GitHub Repository
          </a>
        </div>
        <div class="text-xs text-text-tertiary">
          Utworzono: sierpień 2025
        </div>
      </div>
      
      <!-- Right side - Disclaimer -->
      <div class="text-xs text-text-tertiary max-w-md text-left md:text-right">
        <p class="mb-2">
          <strong>Zastrzeżenie:</strong> Ta strona nie jest oficjalną stroną Urzędu Miasta Łodzi. 
          Stanowi nieoficjalną mapę projektów Budżetu Obywatelskiego Łodzi 2025-2026.
        </p>
        <p>
          Dane pochodzą z publicznych źródeł. W przypadku rozbieżności obowiązują informacje 
          z oficjalnej strony <a href="https://budzetobywatelski.uml.lodz.pl/" target="_blank" rel="noopener noreferrer" class="underline hover:text-text-secondary">budzetobywatelski.uml.lodz.pl</a>.
        </p>
      </div>
    </div>
  </div>
</footer>

<!-- Banner -->
<div id="banner-container" class="fixed top-[calc(10vh+0.5rem)] md:top-[12vh] right-4 z-50 transition-all duration-300">
  <div class="relative">
    <button id="close-banner" class="absolute -top-2 -right-2 bg-white border border-border-default rounded-full p-1 hover:bg-hover transition-colors shadow-md z-10">
      <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
    <iframe 
      src="/banner/banner.html" 
      class="w-80 h-24 border-0 rounded-lg shadow-custom-lg bg-white"
      style="max-width: calc(100vw - 2rem);"
      loading="lazy">
    </iframe>
  </div>
</div>

<!-- Build Version -->
<script>
  console.log('🔧 Build timestamp: ${new Date().toISOString()}');
  console.log('📦 Static files generated for Vercel deployment');
</script>

<!-- Map Page JavaScript -->
<script type="module" src="/src/map.js?v=${Date.now()}"></script>

<!-- Vercel Analytics -->
<script defer src="/_vercel/insights/script.js"></script>

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Map",
  "name": "${title}",
  "description": "${description}",
  "areaServed": {
    "@type": "City",
    "name": "Łódź",
    "addressCountry": "PL"
  },
  "hasMap": {
    "@type": "Map",
    "mapType": "VenueMap"
  },
  "about": {
    "@type": "GovernmentProject",
    "name": "Budżet Obywatelski Łódź 2025-2026",
    "description": "Projekty budżetu obywatelskiego miasta Łodzi na lata 2025-2026"
  }
}
</script>`;

    const html = this.generateBaseHTML(title, description, content, '', 'bg-secondary');
    await fs.writeFile(path.join(publicDir, 'index.html'), html);
    console.log('✅ Generated index.html (map page)');
  }


  static async generateProjectPage(project, publicDir) {
    const title = `${project.nazwa} – Budżet Obywatelski Łódź`;
    const description = `${project.opis?.substring(0, 150) || 'Projekt budżetu obywatelskiego'}... Koszt: ${new Intl.NumberFormat('pl-PL').format(project.koszt)} zł. Kategoria: ${project.kategoria}. Osiedle: ${project.osiedle}.`;
    
    const content = `
<!-- Header -->
<header class="bg-primary border-b border-border-default">
  <div class="container mx-auto px-4 py-4">
    <div class="flex items-center space-x-4">
      <a href="${project.lat && project.lng ? `/?lat=${project.lat}&lng=${project.lng}&zoom=16&id=${project.id}` : '/'}" class="text-text-tertiary hover:text-text-secondary">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
      </a>
      <div>
        <h1 class="text-xl font-bold text-text-primary">Projekt ${project.id}</h1>
        <p class="text-text-tertiary">Budżet Obywatelski Łódź 2025–2026</p>
      </div>
    </div>
  </div>
</header>

<!-- Project Details -->
<main class="container mx-auto px-4 py-8">
  <article class="max-w-4xl mx-auto">
    <!-- Project Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-text-primary mb-4">${project.nazwa}</h1>
      
      <div class="flex flex-wrap gap-4 mb-6">
        <div class="px-3 py-1 bg-tertiary rounded-full text-sm text-text-secondary">
          ${project.kategoria}
        </div>
        <div class="px-3 py-1 bg-tertiary rounded-full text-sm text-text-secondary">
          ${project.typ}
        </div>
        <div class="px-3 py-1 bg-tertiary rounded-full text-sm text-text-secondary">
          ${project.osiedle}
        </div>
      </div>
      
      <div class="text-2xl font-bold text-text-primary mb-4">
        ${new Intl.NumberFormat('pl-PL').format(project.koszt)} zł
      </div>
    </div>
    
    <!-- Project Description -->
    <div class="prose max-w-none mb-8">
      <h2 class="text-xl font-semibold text-text-primary mb-4">Opis projektu</h2>
      <p class="text-text-secondary leading-relaxed whitespace-pre-wrap">${project.opis || 'Brak opisu.'}</p>
    </div>
    
    <!-- Location Info -->
    ${project.lokalizacjaTekst ? `
    <div class="mb-8">
      <h2 class="text-xl font-semibold text-text-primary mb-4">Lokalizacja</h2>
      <p class="text-text-secondary">${project.lokalizacjaTekst}</p>
    </div>
    ` : ''}
    
    <!-- Actions -->
    <div class="flex flex-wrap gap-4 mb-8">
      <a 
        href="${project.lat && project.lng ? `/?lat=${project.lat}&lng=${project.lng}&zoom=16&id=${project.id}` : `/?id=${project.id}`}" 
        class="px-6 py-3 bg-tertiary hover:bg-hover border border-border-default rounded-lg text-text-secondary hover:text-text-primary transition-colors"
      >
        Pokaż na mapie
      </a>
      
      ${project.lat && project.lng ? `
      <a 
        href="https://www.google.com/maps?q=${project.lat},${project.lng}" 
        target="_blank" 
        rel="noopener noreferrer"
        class="px-6 py-3 bg-tertiary hover:bg-hover border border-border-default rounded-lg text-text-secondary hover:text-text-primary transition-colors"
      >
        Otwórz w Google Maps
      </a>
      ` : ''}
      
      ${project.linkZrodlowy ? `
      <a 
        href="${project.linkZrodlowy}" 
        target="_blank" 
        rel="noopener noreferrer"
        class="px-6 py-3 bg-tertiary hover:bg-hover border border-border-default rounded-lg text-text-secondary hover:text-text-primary transition-colors"
      >
        Zobacz na stronie urzędu
      </a>
      ` : ''}
    </div>
  </article>
</main>

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "${project.nazwa}",
  "description": "${project.opis?.substring(0, 200) || 'Projekt budżetu obywatelskiego'}",
  "identifier": "${project.id}",
  "areaServed": {
    "@type": "City",
    "name": "Łódź",
    "addressCountry": "PL"
  },
  "about": {
    "@type": "GovernmentProject",
    "name": "Budżet Obywatelski Łódź 2025-2026",
    "description": "Projekty budżetu obywatelskiego miasta Łodzi na lata 2025-2026"
  },
  "category": "${project.kategoria}",
  ${project.lat && project.lng ? `
  "location": {
    "@type": "Place",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": ${project.lat},
      "longitude": ${project.lng}
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Łódź",
      "addressCountry": "PL"
    }
  },
  ` : ''}
  "url": "https://budzetobywatelski.vercel.app/projekty/${project.id}.html"
}
</script>`;

    const html = this.generateBaseHTML(title, description, content);
    
    const filename = `${project.id}.html`;
    const filepath = path.join(publicDir, 'projekty', filename);
    
    await fs.writeFile(filepath, html);
  }
}

module.exports = { generateHTML: HTMLGenerator };