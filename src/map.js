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
    
    // Banner close button
    const closeBanner = document.getElementById('close-banner');
    const bannerContainer = document.getElementById('banner-container');
    if (closeBanner && bannerContainer) {
      closeBanner.addEventListener('click', () => {
        bannerContainer.style.display = 'none';
        // Save preference in localStorage
        localStorage.setItem('bannerHidden', 'true');
      });
      
      // Check if banner was previously hidden
      if (localStorage.getItem('bannerHidden') === 'true') {
        bannerContainer.style.display = 'none';
      }
    }
    
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
    
    // Sort dropdown
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        this.sortProjects(e.target.value);
        this.updateDisplay();
      });
    }
    
    // View toggle buttons (removed as we no longer have them in new layout)
  }

  initFilterToggle() {
    const filterToggleMobile = document.getElementById('filter-toggle');
    const filterToggleDesktop = document.getElementById('filter-toggle-desktop');
    const filterPanel = document.getElementById('filter-panel');
    const filterOverlay = document.getElementById('filter-overlay');
    const closeFilter = document.getElementById('close-filter');
    const filterPanelToggle = document.getElementById('filter-panel-toggle');
    const filterPanelExpand = document.getElementById('filter-panel-expand');
    const filterCollapseIcon = document.getElementById('filter-collapse-icon');
    const projectsPanel = document.getElementById('projects-panel');
    const projectsPanelToggle = document.getElementById('projects-panel-toggle');
    const projectsCollapseIcon = document.getElementById('projects-collapse-icon');
    const projectsHeader = document.getElementById('projects-header');
    const mapContainer = document.getElementById('map-container');
    
    // Mobile filter toggle
    if (filterToggleMobile && filterPanel && filterOverlay) {
      filterToggleMobile.addEventListener('click', () => {
        filterPanel.classList.remove('-translate-x-full');
        filterOverlay.classList.remove('hidden');
      });
    }
    
    // Desktop filter panel collapse toggle
    if (filterPanelToggle && filterPanel && filterPanelExpand) {
      filterPanelToggle.addEventListener('click', () => {
        // Collapse panel - make it width 0 and hide content
        filterPanel.classList.remove('md:w-96');
        filterPanel.classList.add('md:w-0', 'md:opacity-0');
        filterPanel.dataset.collapsed = 'true';
        
        // Show expand button
        filterPanelExpand.classList.remove('hidden', 'md:hidden');
        filterPanelExpand.classList.add('md:block');
        
        // Invalidate map size when toggling panel
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 300);
      });
    }
    
    // Filter panel expand button
    if (filterPanelExpand && filterPanel) {
      filterPanelExpand.addEventListener('click', () => {
        // Expand panel - restore width and opacity
        filterPanel.classList.remove('md:w-0', 'md:opacity-0');
        filterPanel.classList.add('md:w-96');
        filterPanel.dataset.collapsed = 'false';
        
        // Hide expand button
        filterPanelExpand.classList.add('hidden', 'md:hidden');
        
        // Invalidate map size
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 300);
      });
    }
    
    // Projects panel collapse toggle
    if (projectsPanelToggle && projectsPanel && projectsCollapseIcon && mapContainer) {
      projectsPanelToggle.addEventListener('click', () => {
        const isCollapsed = projectsPanel.dataset.collapsed === 'true';
        
        if (isCollapsed) {
          // Expand panel - restore original size
          projectsPanel.classList.remove('h-14');
          projectsPanel.classList.add('h-[45%]', 'md:h-[60%]');
          projectsPanel.dataset.collapsed = 'false';
          projectsCollapseIcon.style.transform = 'rotate(0deg)';
          
          // Restore map container size
          mapContainer.classList.remove('h-[calc(100%-3.5rem)]', 'md:h-[calc(100%-3.5rem)]');
          mapContainer.classList.add('h-[55%]', 'md:h-[40%]');
          
          // Show full content
          const projectList = projectsPanel.querySelector('.overflow-y-auto');
          if (projectList) {
            projectList.classList.remove('hidden');
          }
        } else {
          // Collapse panel to just header (h-14 = 3.5rem)
          projectsPanel.classList.remove('h-[45%]', 'md:h-[60%]');
          projectsPanel.classList.add('h-14');
          projectsPanel.dataset.collapsed = 'true';
          projectsCollapseIcon.style.transform = 'rotate(-180deg)';
          
          // Expand map container to fill remaining space
          mapContainer.classList.remove('h-[55%]', 'md:h-[40%]');
          mapContainer.classList.add('h-[calc(100%-3.5rem)]', 'md:h-[calc(100%-3.5rem)]');
          
          // Hide content, keep header visible
          const projectList = projectsPanel.querySelector('.overflow-y-auto');
          if (projectList) {
            projectList.classList.add('hidden');
          }
        }
        
        // Invalidate map size when toggling panel
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 300);
      });
    }
    
    // Desktop hamburger menu toggle (keeping for compatibility)
    if (filterToggleDesktop && filterPanel && filterPanelExpand) {
      filterToggleDesktop.addEventListener('click', () => {
        const isCollapsed = filterPanel.dataset.collapsed === 'true';
        
        if (isCollapsed) {
          // Expand panel
          filterPanel.classList.remove('md:w-0', 'md:opacity-0');
          filterPanel.classList.add('md:w-96');
          filterPanel.dataset.collapsed = 'false';
          filterPanelExpand.classList.add('hidden', 'md:hidden');
        } else {
          // Collapse panel
          filterPanel.classList.remove('md:w-96');
          filterPanel.classList.add('md:w-0', 'md:opacity-0');
          filterPanel.dataset.collapsed = 'true';
          filterPanelExpand.classList.remove('hidden', 'md:hidden');
          filterPanelExpand.classList.add('md:block');
        }
        
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 300);
      });
    }
    
    // Close filter on mobile
    if (closeFilter && filterPanel && filterOverlay) {
      closeFilter.addEventListener('click', () => {
        filterPanel.classList.add('-translate-x-full');
        filterOverlay.classList.add('hidden');
      });
    }
    
    // Close on overlay click
    if (filterOverlay && filterPanel) {
      filterOverlay.addEventListener('click', () => {
        filterPanel.classList.add('-translate-x-full');
        filterOverlay.classList.add('hidden');
      });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
      const isMobile = window.innerWidth < 768;
      
      if (isMobile && filterPanel && filterOverlay) {
        // Ensure mobile state is correct
        if (!filterPanel.classList.contains('-translate-x-full')) {
          filterOverlay.classList.remove('hidden');
        }
      } else if (filterPanel && filterOverlay) {
        // Desktop - hide overlay and reset panel position
        filterOverlay.classList.add('hidden');
        filterPanel.classList.remove('-translate-x-full');
      }
      
      // Invalidate map size on resize
      if (this.map) {
        this.map.invalidateSize();
      }
    });
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

  sortProjects(sortType) {
    // First separate L068 project if it exists in filtered projects
    const l068Index = this.filteredProjects.findIndex(p => p.id === 'L068');
    let l068Project = null;
    
    if (l068Index !== -1) {
      l068Project = this.filteredProjects.splice(l068Index, 1)[0];
    }
    
    // Sort the remaining projects
    switch(sortType) {
      case 'name':
        this.filteredProjects.sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
        break;
      case 'cost-desc':
        this.filteredProjects.sort((a, b) => b.koszt - a.koszt);
        break;
      case 'cost-asc':
        this.filteredProjects.sort((a, b) => a.koszt - b.koszt);
        break;
      case 'district':
        this.filteredProjects.sort((a, b) => {
          const districtA = a.osiedle || '';
          const districtB = b.osiedle || '';
          return districtA.localeCompare(districtB, 'pl');
        });
        break;
      default:
        // Default to name sort
        this.filteredProjects.sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
    }
    
    // Place L068 project first if it exists
    if (l068Project) {
      this.filteredProjects.unshift(l068Project);
    }
  }

  updateDisplay() {
    // Ensure L068 is always first
    this.ensureL068First();
    
    // Update map markers
    this.updateMapMarkers();
    
    // Update results count
    this.updateResultsCount();
    
    // Update project list in sidebar
    this.updateProjectList();
  }
  
  ensureL068First() {
    // Find L068 project and move it to the front if it exists
    const l068Index = this.filteredProjects.findIndex(p => p.id === 'L068');
    if (l068Index > 0) {
      const l068Project = this.filteredProjects.splice(l068Index, 1)[0];
      this.filteredProjects.unshift(l068Project);
    }
  }

  updateMapMarkers() {
    // Clear existing markers
    this.markersGroup.clearLayers();
    
    // Add markers for filtered projects with coordinates
    const geocodedProjects = this.filteredProjects.filter(p => p.lat && p.lng);
    
    geocodedProjects.forEach(project => {
      let marker;
      
      // Create special marker for L068 project
      if (project.id === 'L068') {
        // Custom orange marker for L068 (very similar to default Leaflet marker)
        const customIcon = new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="25" height="41">
              <path fill="#ff7800" stroke="#fff" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,6.9,12.5,28.5,12.5,28.5s12.5-21.6,12.5-28.5C25,5.6,19.4,0,12.5,0z"/>
              <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
            </svg>
          `),
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          shadowSize: [41, 41],
          shadowAnchor: [12, 41]
        });
        marker = L.marker([project.lat, project.lng], { 
          icon: customIcon,
          zIndexOffset: 1000  // High z-index to appear above other markers
        });
      } else {
        // Regular marker for other projects
        marker = L.marker([project.lat, project.lng]);
      }
      
      // Create popup content
      const popupContent = this.createMarkerPopup(project);
      marker.bindPopup(popupContent, { maxWidth: 300 });
      
      // Add click handler to highlight project in sidebar
      marker.on('click', () => {
        this.highlightProject(project.id);
      });
      
      this.markersGroup.addLayer(marker);
    });
    
    // Only fit map to markers on desktop, keep Łódź center on mobile
    if (geocodedProjects.length > 0 && window.innerWidth >= 768) {
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
             class="inline-block bg-gray-600 px-3 py-1.5 text-xs rounded hover:bg-gray-700 transition-colors font-medium" 
             style="color: white !important;">
            Zobacz szczegóły
          </a>
        </div>
      </div>
    `;
  }

  updateResultsCount() {
    const countElement = document.getElementById('results-count');
    if (countElement) {
      const filtered = this.filteredProjects.length;
      countElement.textContent = `(${filtered})`;
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
      // Zoom to project location
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
    
    // Handle map location parameters first
    if (urlParams.has('lat') && urlParams.has('lng')) {
      const lat = parseFloat(urlParams.get('lat'));
      const lng = parseFloat(urlParams.get('lng'));
      const zoom = urlParams.has('zoom') ? parseInt(urlParams.get('zoom')) : 16;
      
      if (!isNaN(lat) && !isNaN(lng)) {
        this.map.setView([lat, lng], zoom);
        
        // If there's a project ID, highlight it
        if (urlParams.has('id')) {
          const projectId = urlParams.get('id');
          setTimeout(() => {
            this.highlightProjectById(projectId);
          }, 500);
        }
      }
    }
    // Handle project ID without coordinates
    else if (urlParams.has('id')) {
      const projectId = urlParams.get('id');
      setTimeout(() => {
        this.highlightProjectById(projectId);
      }, 500);
    }
    
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

  zoomToProject(project) {
    if (project && project.lat && project.lng) {
      this.map.setView([project.lat, project.lng], 16);
      
      // Find and open the marker popup
      this.markers.forEach(marker => {
        if (marker.getLatLng().lat === project.lat && marker.getLatLng().lng === project.lng) {
          marker.openPopup();
        }
      });
    }
  }

  highlightProjectById(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      this.zoomToProject(project);
    }
  }

  parseURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if we have coordinates from project detail page navigation
    if (urlParams.has('lat') && urlParams.has('lng')) {
      const lat = parseFloat(urlParams.get('lat'));
      const lng = parseFloat(urlParams.get('lng'));
      const zoom = parseInt(urlParams.get('zoom')) || 16;
      const projectId = urlParams.get('id');
      
      if (!isNaN(lat) && !isNaN(lng)) {
        // Wait for map to be ready, then set view and highlight project
        setTimeout(() => {
          this.map.setView([lat, lng], zoom);
          
          if (projectId) {
            // Find and highlight the project
            this.highlightProject(projectId);
            
            // Find and open marker popup
            this.markersGroup.eachLayer(marker => {
              if (marker.getLatLng().lat === lat && marker.getLatLng().lng === lng) {
                marker.openPopup();
              }
            });
          }
        }, 500);
      }
    }
  }

  zoomToProject(project) {
    if (project && project.lat && project.lng) {
      this.map.setView([project.lat, project.lng], 16);
      this.highlightProject(project.id);
    }
  }
}

// Initialize map page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const mapPage = new MapPage();
  
  // Export for global access
  window.mapPage = mapPage;
});