// Map page implementation with Leaflet and OpenStreetMap
class MapPage {
  constructor() {
    this.map = null;
    this.markersGroup = null;
    this.projects = [];
    this.filteredProjects = [];
    this.filters = {
      search: '',
      category: '',
      district: ''
    };
    
    this.init();
  }

  async init() {
    try {
      // Load project data
      await this.loadData();
      
      // Initialize map
      this.initMap();
      
      // Initialize UI components
      this.initFilters();
      this.initEventListeners();
      
      // Display all projects initially
      this.updateDisplay();
      
      // Parse URL parameters for shared filters
      this.parseURLParams();
      
    } catch (error) {
      console.error('Failed to initialize map page:', error);
      this.showError('Nie udało się załadować danych projektów');
    }
  }

  async loadData() {
    const response = await fetch('/data/projekty.json');
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status}`);
    }
    
    const data = await response.json();
    this.projects = data.projects || [];
    this.filteredProjects = [...this.projects];
    
    console.log(`Loaded ${this.projects.length} projects`);
  }

  initMap() {
    // Initialize Leaflet map centered on Łódź with proper interaction options
    this.map = L.map('map', {
      center: [51.7592, 19.4550],
      zoom: 11,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
      zoomControl: true
    });
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
      minZoom: 5
    }).addTo(this.map);
    
    // Initialize markers group
    this.markersGroup = L.layerGroup().addTo(this.map);
    
    // Force invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
    
    // Hide loading indicator once map is ready
    this.map.whenReady(() => {
      const loadingDiv = document.getElementById('mapLoading');
      if (loadingDiv) {
        loadingDiv.style.display = 'none';
      }
    });
    
    // Add window resize handler
    window.addEventListener('resize', () => {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    });
  }

  initFilters() {
    // Populate filter dropdowns with unique values
    this.populateFilterOptions();
  }

  populateFilterOptions() {
    // Get unique values for each filter
    const categories = [...new Set(this.projects.map(p => p.kategoria).filter(Boolean))].sort();
    const districts = [...new Set(this.projects.map(p => p.osiedle).filter(Boolean))].sort();
    
    // Add PONADOSIEDLOWE at the top of districts
    const sortedDistricts = ['PONADOSIEDLOWE', ...districts.filter(d => d.toUpperCase() !== 'PONADOSIEDLOWE')];
    
    // Populate category filter
    const categorySelect = document.getElementById('category-filter');
    if (categorySelect) {
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
    }
    
    // Populate district filter
    const districtSelect = document.getElementById('district-filter');
    if (districtSelect) {
      // Clear existing options except first one
      while (districtSelect.children.length > 1) {
        districtSelect.removeChild(districtSelect.lastChild);
      }
      
      sortedDistricts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
      });
    }
  }

  initEventListeners() {
    // Filter panel toggle
    this.initFilterToggle();
    
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.applyFilters();
      });
    }
    
    // Filter dropdowns
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.applyFilters();
      });
    }
    
    const districtFilter = document.getElementById('district-filter');
    if (districtFilter) {
      districtFilter.addEventListener('change', (e) => {
        this.filters.district = e.target.value;
        this.applyFilters();
      });
    }
    
    // Clear filters button
    const clearButton = document.getElementById('clear-filters');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clearFilters();
      });
    }
    
    // View toggle buttons
    const mapViewBtn = document.getElementById('map-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    
    if (listViewBtn) {
      listViewBtn.addEventListener('click', () => {
        window.location.href = '/lista.html' + this.buildURLParams();
      });
    }
  }

  initFilterToggle() {
    const filterToggle = document.getElementById('filter-toggle');
    const filterContent = document.getElementById('filter-content');
    const filterChevron = document.getElementById('filter-chevron');
    const filterPanel = document.getElementById('filter-panel');
    
    if (filterToggle && filterContent && filterChevron && filterPanel) {
      // Check if mobile
      const isMobile = window.innerWidth < 768;
      
      // Set initial state - collapsed on mobile, open on desktop
      if (isMobile) {
        filterContent.classList.add('hidden');
        filterChevron.classList.add('rotate-180');
        filterPanel.classList.add('-translate-y-full');
      } else {
        filterContent.classList.remove('hidden');
        filterChevron.classList.remove('rotate-180');
        filterPanel.classList.remove('-translate-y-full');
      }
      
      filterToggle.addEventListener('click', () => {
        const isHidden = filterContent.classList.contains('hidden');
        
        if (isHidden) {
          filterContent.classList.remove('hidden');
          filterChevron.classList.remove('rotate-180');
          filterPanel.classList.remove('-translate-y-full');
        } else {
          filterContent.classList.add('hidden');
          filterChevron.classList.add('rotate-180');
          filterPanel.classList.add('-translate-y-full');
        }
      });
      
      // Handle window resize
      window.addEventListener('resize', () => {
        const isMobileNow = window.innerWidth < 768;
        if (!isMobileNow && filterContent.classList.contains('hidden')) {
          // On desktop, show filters by default
          filterContent.classList.remove('hidden');
          filterChevron.classList.remove('rotate-180');
          filterPanel.classList.remove('-translate-y-full');
        }
      });
    }
  }

  applyFilters() {
    this.filteredProjects = this.projects.filter(project => {
      // Search filter
      if (this.filters.search && !this.matchesSearch(project, this.filters.search)) {
        return false;
      }
      
      // Category filter
      if (this.filters.category && project.kategoria !== this.filters.category) {
        return false;
      }
      
      // District filter
      if (this.filters.district && project.osiedle !== this.filters.district) {
        return false;
      }
      
      return true;
    });
    
    this.updateDisplay();
    this.updateURL();
  }

  matchesSearch(project, searchTerm) {
    const searchFields = [
      project.nazwa,
      project.opis,
      project.kategoria,
      project.typ,
      project.osiedle,
      project.lokalizacjaTekst
    ].filter(Boolean);
    
    return searchFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  }

  updateDisplay() {
    // Update map markers
    this.updateMapMarkers();
    
    // Update results count
    this.updateResultsCount();
    
    // Update project list in sidebar
    this.updateProjectList();
  }

  updateMapMarkers() {
    // Clear existing markers
    this.markersGroup.clearLayers();
    
    // Add markers for filtered projects with coordinates
    const geocodedProjects = this.filteredProjects.filter(p => p.lat && p.lng);
    
    geocodedProjects.forEach(project => {
      const marker = L.marker([project.lat, project.lng]);
      
      // Create popup content
      const popupContent = this.createMarkerPopup(project);
      marker.bindPopup(popupContent, { maxWidth: 300 });
      
      // Add click handler to highlight project in sidebar
      marker.on('click', () => {
        this.highlightProject(project.id);
      });
      
      this.markersGroup.addLayer(marker);
    });
    
    // Fit map to markers if there are any
    if (geocodedProjects.length > 0) {
      const group = new L.featureGroup(this.markersGroup.getLayers());
      if (group.getBounds().isValid()) {
        this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
      }
    }
  }

  createMarkerPopup(project) {
    const cost = project.koszt ? `${project.koszt.toLocaleString('pl-PL')} zł` : 'Nie określono';
    
    return `
      <div class="p-3">
        <h3 class="font-semibold text-sm mb-2 text-gray-900">${project.nazwa || 'Bez nazwy'}</h3>
        <div class="text-xs text-gray-600 space-y-1">
          <div><strong>Kategoria:</strong> ${project.kategoria || 'Nie określono'}</div>
          <div><strong>Typ:</strong> ${project.typ || 'Nie określono'}</div>
          <div><strong>Osiedle:</strong> ${project.osiedle || 'Nie określono'}</div>
          <div><strong>Koszt:</strong> ${cost}</div>
          <div><strong>Lokalizacja:</strong> ${project.lokalizacjaTekst || 'Nie określono'}</div>
        </div>
        <div class="mt-3 space-y-2">
          <a href="/projekty/${project.id}.html" 
             class="inline-block bg-gray-900 text-white px-3 py-1 text-xs rounded hover:bg-gray-700 transition-colors">
            Zobacz szczegóły
          </a>
        </div>
      </div>
    `;
  }

  updateResultsCount() {
    const countElement = document.getElementById('results-count');
    if (countElement) {
      const total = this.projects.length;
      const filtered = this.filteredProjects.length;
      const geocoded = this.filteredProjects.filter(p => p.lat && p.lng).length;
      
      countElement.textContent = `Znaleziono ${filtered} z ${total} projektów${geocoded < filtered ? ` (${geocoded} z lokalizacją)` : ''}`;
    }
  }

  updateProjectList() {
    const listElement = document.getElementById('project-list');
    if (!listElement) return;
    
    if (this.filteredProjects.length === 0) {
      listElement.innerHTML = `
        <div class="text-center text-gray-500 py-8 col-span-full">
          <p class="text-sm">Nie znaleziono projektów spełniających kryteria wyszukiwania.</p>
        </div>
      `;
      return;
    }
    
    // Show first 50 projects in grid (better for larger list area)
    const projectsToShow = this.filteredProjects.slice(0, 50);
    const remainingCount = this.filteredProjects.length - projectsToShow.length;
    
    listElement.innerHTML = projectsToShow.map(project => 
      this.createGridProjectCard(project)
    ).join('') + (remainingCount > 0 ? `
      <div class="text-center text-gray-500 p-4 col-span-full">
        <p class="text-sm">I ${remainingCount} więcej projektów na mapie...</p>
      </div>
    ` : '');
  }

  createGridProjectCard(project) {
    const cost = project.koszt ? `${project.koszt.toLocaleString('pl-PL')} zł` : 'Nie określono';
    const hasLocation = project.lat && project.lng;
    
    return `
      <div class="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow" 
           data-project-id="${project.id}">
        <h4 class="font-semibold text-sm mb-2 text-gray-900 leading-tight line-clamp-2">
          <a href="/projekty/${project.id}.html" class="hover:underline">
            ${project.nazwa || 'Bez nazwy'}
          </a>
        </h4>
        
        <div class="text-xs text-gray-600 space-y-1 mb-3">
          <div><span class="font-medium">Kategoria:</span> ${project.kategoria || 'Nie określono'}</div>
          <div><span class="font-medium">Osiedle:</span> ${project.osiedle || 'Nie określono'}</div>
          <div><span class="font-medium">Koszt:</span> ${cost}</div>
        </div>
        
        <div class="flex justify-between items-center">
          <a href="/projekty/${project.id}.html" 
             class="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">
            Szczegóły
          </a>
          ${hasLocation ? `
            <button class="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                    onclick="mapPage.focusOnProject('${project.id}')">
              Na mapie
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  createHorizontalProjectCard(project) {
    const cost = project.koszt ? `${project.koszt.toLocaleString('pl-PL')} zł` : 'Nie określono';
    const hasLocation = project.lat && project.lng;
    
    return `
      <div class="flex-shrink-0 bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow w-64" 
           data-project-id="${project.id}">
        <h4 class="font-semibold text-sm mb-2 text-gray-900 leading-tight">
          <a href="/projekty/${project.id}.html" class="hover:underline">
            ${project.nazwa || 'Bez nazwy'}
          </a>
        </h4>
        
        <div class="text-xs text-gray-600 space-y-1 mb-2">
          <div><span class="font-medium">Kategoria:</span> ${project.kategoria || 'Nie określono'}</div>
          <div><span class="font-medium">Osiedle:</span> ${project.osiedle || 'Nie określono'}</div>
          <div><span class="font-medium">Koszt:</span> ${cost}</div>
        </div>
        
        <div class="flex justify-between items-center">
          <a href="/projekty/${project.id}.html" 
             class="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">
            Szczegóły
          </a>
          ${hasLocation ? `
            <button class="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                    onclick="mapPage.focusOnProject('${project.id}')">
              Pokaż na mapie
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  createProjectCard(project) {
    const cost = project.koszt ? `${project.koszt.toLocaleString('pl-PL')} zł` : 'Nie określono';
    const hasLocation = project.lat && project.lng;
    
    return `
      <div class="project-card bg-white border border-gray-200 p-4 hover:shadow-md transition-shadow" 
           data-project-id="${project.id}">
        <h3 class="font-semibold text-sm mb-2 text-gray-900 leading-tight">
          <a href="/projekty/${project.id}.html" class="hover:underline">
            ${project.nazwa || 'Bez nazwy'}
          </a>
        </h3>
        
        <div class="text-xs text-gray-600 space-y-1 mb-3">
          <div><span class="font-medium">Kategoria:</span> ${project.kategoria || 'Nie określono'}</div>
          <div><span class="font-medium">Typ:</span> ${project.typ || 'Nie określono'}</div>
          <div><span class="font-medium">Osiedle:</span> ${project.osiedle || 'Nie określono'}</div>
          <div><span class="font-medium">Koszt:</span> ${cost}</div>
          ${hasLocation ? `<div><span class="font-medium">Lokalizacja:</span> ${project.lokalizacjaTekst || 'Nie określono'}</div>` : ''}
        </div>
        
        <div class="flex justify-between items-center">
          <a href="/projekty/${project.id}.html" 
             class="text-xs bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors">
            Szczegóły
          </a>
          ${hasLocation ? `
            <button class="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                    onclick="mapPage.focusOnProject('${project.id}')">
              Pokaż na mapie
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  focusOnProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (project && project.lat && project.lng) {
      this.map.setView([project.lat, project.lng], 16);
      
      // Find and open the marker popup
      this.markersGroup.eachLayer(marker => {
        if (marker.getLatLng().lat === project.lat && marker.getLatLng().lng === project.lng) {
          marker.openPopup();
        }
      });
      
      this.highlightProject(projectId);
    }
  }

  highlightProject(projectId) {
    // Remove previous highlights
    document.querySelectorAll('.project-card').forEach(card => {
      card.classList.remove('ring-2', 'ring-blue-500');
    });
    
    // Highlight the selected project
    const card = document.querySelector(`[data-project-id="${projectId}"]`);
    if (card) {
      card.classList.add('ring-2', 'ring-blue-500');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  clearFilters() {
    // Reset all filters
    this.filters = {
      search: '',
      category: '',
      district: ''
    };
    
    // Reset form inputs
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) categoryFilter.value = '';
    
    const districtFilter = document.getElementById('district-filter');
    if (districtFilter) districtFilter.value = '';
    
    // Apply filters (will show all projects)
    this.applyFilters();
  }

  parseURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Apply URL parameters to filters
    if (urlParams.has('search')) {
      this.filters.search = urlParams.get('search');
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = this.filters.search;
    }
    
    if (urlParams.has('category')) {
      this.filters.category = urlParams.get('category');
      const categoryFilter = document.getElementById('category-filter');
      if (categoryFilter) categoryFilter.value = this.filters.category;
    }
    
    if (urlParams.has('district')) {
      this.filters.district = urlParams.get('district');
      const districtFilter = document.getElementById('district-filter');
      if (districtFilter) districtFilter.value = this.filters.district;
    }
    
    // Apply filters if any URL params were found
    if (urlParams.toString()) {
      this.applyFilters();
    }
  }

  buildURLParams() {
    const params = new URLSearchParams();
    
    if (this.filters.search) params.set('search', this.filters.search);
    if (this.filters.category) params.set('category', this.filters.category);
    if (this.filters.district) params.set('district', this.filters.district);
    
    return params.toString() ? '?' + params.toString() : '';
  }

  updateURL() {
    const newURL = window.location.pathname + this.buildURLParams();
    window.history.replaceState({}, '', newURL);
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

// Initialize map page when DOM is loaded
let mapPage;
document.addEventListener('DOMContentLoaded', () => {
  mapPage = new MapPage();
});

// Export for global access
window.mapPage = mapPage;