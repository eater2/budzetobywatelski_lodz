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
  <meta name="keywords" content="budżet obywatelski łódź mapa, budżet obywatelski 2025 łódź, bo łódź 2026, mapa projektów łódź, lbo łódź mapa">
  
  <!-- OpenGraph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pl_PL">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  
  <!-- Icons -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.webmanifest">
  
  <!-- Preload critical resources -->
  <link rel="preload" href="/data/projekty.json" as="fetch" crossorigin="anonymous">
  <link rel="preload" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" as="style">
  
  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
  
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
          },
          aspectRatio: {
            '16/9': '16 / 9',
            'border-default': '#E6E6E6',
            'border-hover': '#DADADA',
            'border-active': '#CFCFCF'
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
<header class="bg-primary border-b border-border-default">
  <div class="container mx-auto px-4 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Budżet Obywatelski Łódź</h1>
        <p class="text-text-tertiary">2025–2026 • ${projectCount} projektów • Mapa</p>
      </div>
      <a href="/lista.html" class="px-4 py-2 bg-tertiary hover:bg-hover border border-border-default rounded-lg text-text-secondary hover:text-text-primary transition-colors">
        Zobacz listę
      </a>
    </div>
  </div>
</header>

<!-- Main Layout -->
<div class="flex flex-col" style="height: calc(100vh - 80px);">
  <!-- Left Panel -->
  <div class="w-96 bg-primary border-r border-border-default flex flex-col overflow-hidden">
    <!-- Search Bar -->
    <div class="p-4 border-b border-border-default">
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
      <h3 class="font-semibold text-text-primary mb-3">Filtry</h3>
      
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
      
      
      <!-- View Toggle -->
      <div class="mb-3">
        <label class="block text-sm font-medium text-text-secondary mb-2">Widok</label>
        <div class="flex rounded-lg border border-border-default overflow-hidden">
          <button id="map-view-btn" class="flex-1 px-3 py-2 text-sm bg-gray-900 text-white">
            Mapa
          </button>
          <button id="list-view-btn" class="flex-1 px-3 py-2 text-sm bg-white text-gray-700 hover:bg-gray-50 border-l border-border-default">
            Lista
          </button>
        </div>
      </div>
    </div>
    
    <!-- Project List Panel -->
    <div class="flex-1 overflow-y-auto p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-text-primary">Projekty <span id="results-count" class="text-text-tertiary">(${projectCount})</span></h3>
        <button id="clear-filters" class="text-sm text-text-tertiary hover:text-text-secondary">Wyczyść</button>
      </div>
      
      <!-- Project cards will be inserted here by JavaScript -->
      <div id="project-list" class="space-y-3">
        <div class="text-center text-text-tertiary py-8">
          <p>Ładowanie projektów...</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Map Container -->
  <div class="flex-1 relative">
    <div id="map" class="w-full h-full"></div>
    
    <!-- Map Loading -->
    <div id="mapLoading" class="absolute inset-0 bg-primary bg-opacity-90 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-text-tertiary mb-4"></div>
        <p class="text-text-secondary">Ładowanie mapy...</p>
      </div>
    </div>
  </div>
</div>

<!-- Banner -->
<div class="fixed bottom-4 right-4 z-50">
  <iframe 
    src="/banner/banner.html" 
    class="w-80 h-24 border-0 rounded-lg shadow-custom-lg"
    style="max-width: calc(100vw - 2rem);"
    loading="lazy">
  </iframe>
</div>

<!-- Map Page JavaScript -->
<script type="module" src="/src/map.js"></script>

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

  static async generateListPage(data, publicDir) {
    const title = 'Lista projektów – Budżet Obywatelski Łódź 2025/2026';
    const description = 'Kompletna lista projektów budżetu obywatelskiego Łodzi 2025/2026 ze zdjęciami Street View, kosztami i szczegółowymi opisami. Filtruj i sortuj projekty.';
    
    const projectCount = data.projects?.length || 0;
    
    const content = `
<!-- Header -->
<header class="bg-primary border-b border-border-default">
  <div class="container mx-auto px-4 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <a href="/" class="text-text-tertiary hover:text-text-secondary">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Budżet Obywatelski Łódź</h1>
          <p class="text-text-tertiary">2025–2026 • ${projectCount} projektów • Lista</p>
        </div>
      </div>
      <a href="/" class="px-4 py-2 bg-tertiary hover:bg-hover border border-border-default rounded-lg text-text-secondary hover:text-text-primary transition-colors">
        Zobacz mapę
      </a>
    </div>
  </div>
</header>

<!-- Filters Bar -->
<div class="bg-primary border-b border-border-default sticky top-0 z-10">
  <div class="container mx-auto px-4 py-4">
    <!-- Search -->
    <div class="mb-4">
      <div class="relative max-w-md">
        <input 
          id="search-input"
          type="search" 
          placeholder="Wyszukaj projekt, opis lub lokalizację..." 
          class="w-full pl-10 pr-4 py-3 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-border-active"
        >
        <svg class="absolute left-3 top-3.5 h-4 w-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
    </div>
    
    <!-- Filter Row -->
    <div class="flex flex-wrap gap-4 items-center">
      <select id="category-filter" class="px-3 py-2 border border-border-default rounded-lg">
        <option value="">Wszystkie kategorie</option>
      </select>
      
      
      <select id="district-filter" class="px-3 py-2 border border-border-default rounded-lg">
        <option value="">Wszystkie osiedla</option>
      </select>
      
      
      <select id="sort-select" class="px-3 py-2 border border-border-default rounded-lg">
        <option value="name">Nazwa A-Z</option>
        <option value="cost-desc">Koszt: od najwyższego</option>
        <option value="cost-asc">Koszt: od najniższego</option>
        <option value="district">Osiedle A-Z</option>
      </select>
      
      <!-- View Toggle -->
      <div class="flex rounded-lg border border-border-default overflow-hidden">
        <button id="map-view-btn" class="px-3 py-2 text-sm bg-white text-gray-700 hover:bg-gray-50 border-r border-border-default">
          Mapa
        </button>
        <button id="list-view-btn" class="px-3 py-2 text-sm bg-gray-900 text-white">
          Lista
        </button>
      </div>
      
      <button id="clear-filters" class="px-3 py-2 text-text-tertiary hover:text-text-secondary">
        Wyczyść filtry
      </button>
      
      <div class="ml-auto text-sm text-text-tertiary">
        <span id="results-count">${projectCount}</span> projektów
      </div>
    </div>
  </div>
</div>

<!-- Main Content -->
<main class="container mx-auto px-4 py-6">
  <!-- Project Grid -->
  <div id="project-list" class="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    <!-- Project cards will be inserted here by JavaScript -->
    <div class="col-span-full text-center text-text-tertiary py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-text-tertiary mx-auto mb-4"></div>
      <p>Ładowanie projektów...</p>
    </div>
  </div>
  
  <!-- Load More Button -->
  <div class="text-center mt-8">
    <button id="loadMore" class="px-6 py-3 bg-tertiary hover:bg-hover border border-border-default rounded-lg text-text-secondary hover:text-text-primary transition-colors hidden">
      Pokaż więcej projektów
    </button>
  </div>
</main>

<!-- List JavaScript -->
<script src="/src/list.js" type="module"></script>

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "${title}",
  "description": "${description}",
  "numberOfItems": ${projectCount},
  "areaServed": {
    "@type": "City",
    "name": "Łódź",
    "addressCountry": "PL"
  },
  "about": {
    "@type": "GovernmentProject", 
    "name": "Budżet Obywatelski Łódź 2025-2026",
    "description": "Projekty budżetu obywatelskiego miasta Łodzi na lata 2025-2026"
  }
}
</script>`;

    const html = this.generateBaseHTML(title, description, content);
    await fs.writeFile(path.join(publicDir, 'lista.html'), html);
    console.log('✅ Generated lista.html (list page)');
  }

  static async generateProjectPage(project, publicDir) {
    const title = `${project.nazwa} – Budżet Obywatelski Łódź`;
    const description = `${project.opis?.substring(0, 150) || 'Projekt budżetu obywatelskiego'}... Koszt: ${new Intl.NumberFormat('pl-PL').format(project.koszt)} zł. Kategoria: ${project.kategoria}. Osiedle: ${project.osiedle}.`;
    
    const content = `
<!-- Header -->
<header class="bg-primary border-b border-border-default">
  <div class="container mx-auto px-4 py-4">
    <div class="flex items-center space-x-4">
      <a href="/lista.html" class="text-text-tertiary hover:text-text-secondary">
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
    
    <!-- Street View Image -->
    ${project.lat && project.lng ? `
    <div class="mb-8">
      <img 
        src="/api/streetview?lat=${project.lat}&lng=${project.lng}&size=800x400&heading=${project.heading || 0}&pitch=${project.pitch || 0}&fov=${project.fov || 90}"
        alt="Zdjęcie miejsca (Street View) – ${project.nazwa}"
        class="w-full h-64 md:h-80 object-cover rounded-lg shadow-custom"
        loading="lazy"
        onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI0Y3RjdGNyIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNkI2QjZCIj5CcmFrIHpkasSZY2lhPC90ZXh0Pjwvc3ZnPg=='"
      >
    </div>
    ` : ''}
    
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
        href="/?id=${project.id}" 
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