// List page implementation with sorting and Street View thumbnails
class ListPage {
  constructor() {
    this.projects = [];
    this.filteredProjects = [];
    this.sortBy = 'nazwa'; // Default sort
    this.sortOrder = 'asc'; // asc or desc
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
      
      // Initialize UI components
      this.initFilters();
      this.initSorting();
      this.initEventListeners();
      
      // Display all projects initially
      this.updateDisplay();
      
      // Parse URL parameters for shared filters
      this.parseURLParams();
      
    } catch (error) {
      console.error('Failed to initialize list page:', error);
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

  initFilters() {
    // Populate filter dropdowns with unique values
    this.populateFilterOptions();
  }

  populateFilterOptions() {
    // Get unique values for each filter
    const categories = [...new Set(this.projects.map(p => p.kategoria).filter(Boolean))].sort();
    const types = [...new Set(this.projects.map(p => p.typ).filter(Boolean))].sort();
    const districts = [...new Set(this.projects.map(p => p.osiedle).filter(Boolean))].sort();
    
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
    
    // Populate type filter
    const typeSelect = document.getElementById('type-filter');
    if (typeSelect) {
      types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
      });
    }
    
    // Populate district filter
    const districtSelect = document.getElementById('district-filter');
    if (districtSelect) {
      districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
      });
    }
  }

  initSorting() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.innerHTML = `
        <option value="nazwa_asc">Nazwa (A-Z)</option>
        <option value="nazwa_desc">Nazwa (Z-A)</option>
        <option value="koszt_desc">Koszt (od najwyższego)</option>
        <option value="koszt_asc">Koszt (od najniższego)</option>
        <option value="kategoria_asc">Kategoria (A-Z)</option>
        <option value="osiedle_asc">Osiedle (A-Z)</option>
        <option value="typ_asc">Typ (A-Z)</option>
      `;
    }
  }

  initEventListeners() {
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
    
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.filters.type = e.target.value;
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
    
    // Cost range filters
    const costMinInput = document.getElementById('cost-min');
    const costMaxInput = document.getElementById('cost-max');
    
    if (costMinInput) {
      costMinInput.addEventListener('input', (e) => {
        this.filters.costMin = e.target.value;
        this.applyFilters();
      });
    }
    
    if (costMaxInput) {
      costMaxInput.addEventListener('input', (e) => {
        this.filters.costMax = e.target.value;
        this.applyFilters();
      });
    }
    
    // Sort dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [sortBy, sortOrder] = e.target.value.split('_');
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        this.applySorting();
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
    
    if (mapViewBtn) {
      mapViewBtn.addEventListener('click', () => {
        window.location.href = '/index.html' + this.buildURLParams();
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
      
      // Type filter
      if (this.filters.type && project.typ !== this.filters.type) {
        return false;
      }
      
      // District filter
      if (this.filters.district && project.osiedle !== this.filters.district) {
        return false;
      }
      
      // Cost range filter
      if (this.filters.costMin && project.koszt < parseFloat(this.filters.costMin)) {
        return false;
      }
      
      if (this.filters.costMax && project.koszt > parseFloat(this.filters.costMax)) {
        return false;
      }
      
      return true;
    });
    
    this.applySorting();
    this.updateURL();
  }

  applySorting() {
    this.filteredProjects.sort((a, b) => {
      let valueA = a[this.sortBy];
      let valueB = b[this.sortBy];
      
      // Handle different data types
      if (this.sortBy === 'koszt') {
        valueA = valueA || 0;
        valueB = valueB || 0;
      } else {
        valueA = (valueA || '').toString().toLowerCase();
        valueB = (valueB || '').toString().toLowerCase();
      }
      
      let comparison = 0;
      if (valueA < valueB) {
        comparison = -1;
      } else if (valueA > valueB) {
        comparison = 1;
      }
      
      return this.sortOrder === 'desc' ? -comparison : comparison;
    });
    
    this.updateDisplay();
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
    // Update results count
    this.updateResultsCount();
    
    // Update project list
    this.updateProjectList();
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
        <div class="p-8 text-center text-gray-500">
          <p class="text-lg mb-2">Nie znaleziono projektów</p>
          <p>Spróbuj zmienić kryteria wyszukiwania</p>
        </div>
      `;
      return;
    }
    
    listElement.innerHTML = this.filteredProjects.map(project => 
      this.createProjectCard(project)
    ).join('');
    
    // Initialize lazy loading for Street View images
    this.initLazyLoading();
  }

  createProjectCard(project) {
    const cost = project.koszt ? `${project.koszt.toLocaleString('pl-PL')} zł` : 'Nie określono';
    const hasLocation = project.lat && project.lng;
    
    // Create Street View URL if location exists
    let streetViewUrl = '';
    if (hasLocation) {
      const params = new URLSearchParams({
        lat: project.lat,
        lng: project.lng,
        size: '400x200',
        heading: project.heading || '0',
        pitch: project.pitch || '0',
        fov: project.fov || '90'
      });
      streetViewUrl = `/api/streetview?${params}`;
    }
    
    return `
      <div class="project-card bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
        ${hasLocation ? `
          <div class="aspect-w-16 aspect-h-9 bg-gray-100">
            <img 
              class="street-view-lazy w-full h-48 object-cover"
              data-src="${streetViewUrl}"
              alt="Street View dla ${project.nazwa}"
              loading="lazy"
            />
            <div class="street-view-placeholder w-full h-48 bg-gray-100 flex items-center justify-center">
              <div class="text-gray-400 text-center">
                <div class="text-2xl mb-2">📍</div>
                <div class="text-sm">Ładowanie Street View...</div>
              </div>
            </div>
          </div>
        ` : `
          <div class="w-full h-48 bg-gray-50 flex items-center justify-center">
            <div class="text-gray-400 text-center">
              <div class="text-2xl mb-2">📍</div>
              <div class="text-sm">Brak lokalizacji</div>
            </div>
          </div>
        `}
        
        <div class="p-6">
          <h3 class="font-bold text-lg mb-3 text-gray-900 leading-tight">
            <a href="/projekty/${project.id}.html" class="hover:underline">
              ${project.nazwa || 'Bez nazwy'}
            </a>
          </h3>
          
          <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
            <div>
              <div class="font-medium text-gray-700 mb-1">Kategoria</div>
              <div>${project.kategoria || 'Nie określono'}</div>
            </div>
            <div>
              <div class="font-medium text-gray-700 mb-1">Typ</div>
              <div>${project.typ || 'Nie określono'}</div>
            </div>
            <div>
              <div class="font-medium text-gray-700 mb-1">Osiedle</div>
              <div>${project.osiedle || 'Nie określono'}</div>
            </div>
            <div>
              <div class="font-medium text-gray-700 mb-1">Koszt</div>
              <div class="font-semibold text-gray-900">${cost}</div>
            </div>
          </div>
          
          ${hasLocation ? `
            <div class="text-sm text-gray-600 mb-4">
              <div class="font-medium text-gray-700 mb-1">Lokalizacja</div>
              <div>${project.lokalizacjaTekst || 'Nie określono'}</div>
            </div>
          ` : ''}
          
          ${project.opis ? `
            <div class="text-sm text-gray-600 mb-4">
              <div class="font-medium text-gray-700 mb-1">Opis</div>
              <div class="line-clamp-3">${project.opis}</div>
            </div>
          ` : ''}
          
          <div class="flex justify-between items-center pt-4 border-t border-gray-100">
            <a href="/projekty/${project.id}.html" 
               class="bg-gray-900 text-white px-4 py-2 text-sm rounded hover:bg-gray-700 transition-colors">
              Zobacz szczegóły
            </a>
            ${hasLocation ? `
              <a href="/index.html?lat=${project.lat}&lng=${project.lng}&zoom=16" 
                 class="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                </svg>
                Zobacz na mapie
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  initLazyLoading() {
    const lazyImages = document.querySelectorAll('.street-view-lazy');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const placeholder = img.parentElement.querySelector('.street-view-placeholder');
          
          img.src = img.dataset.src;
          img.classList.remove('street-view-lazy');
          
          img.onload = () => {
            img.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
          };
          
          img.onerror = () => {
            if (placeholder) {
              placeholder.innerHTML = `
                <div class="text-gray-400 text-center">
                  <div class="text-2xl mb-2">❌</div>
                  <div class="text-sm">Brak Street View</div>
                </div>
              `;
            }
          };
          
          observer.unobserve(img);
        }
      });
    });
    
    lazyImages.forEach(img => {
      img.style.display = 'none';
      imageObserver.observe(img);
    });
  }

  clearFilters() {
    // Reset all filters
    this.filters = {
      search: '',
      category: '',
      district: ''
    };
    
    // Reset sort
    this.sortBy = 'nazwa';
    this.sortOrder = 'asc';
    
    // Reset form inputs
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) categoryFilter.value = '';
    
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) typeFilter.value = '';
    
    const districtFilter = document.getElementById('district-filter');
    if (districtFilter) districtFilter.value = '';
    
    const costMinInput = document.getElementById('cost-min');
    if (costMinInput) costMinInput.value = '';
    
    const costMaxInput = document.getElementById('cost-max');
    if (costMaxInput) costMaxInput.value = '';
    
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'nazwa_asc';
    
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
    
    if (urlParams.has('type')) {
      this.filters.type = urlParams.get('type');
      const typeFilter = document.getElementById('type-filter');
      if (typeFilter) typeFilter.value = this.filters.type;
    }
    
    if (urlParams.has('district')) {
      this.filters.district = urlParams.get('district');
      const districtFilter = document.getElementById('district-filter');
      if (districtFilter) districtFilter.value = this.filters.district;
    }
    
    if (urlParams.has('costMin')) {
      this.filters.costMin = urlParams.get('costMin');
      const costMinInput = document.getElementById('cost-min');
      if (costMinInput) costMinInput.value = this.filters.costMin;
    }
    
    if (urlParams.has('costMax')) {
      this.filters.costMax = urlParams.get('costMax');
      const costMaxInput = document.getElementById('cost-max');
      if (costMaxInput) costMaxInput.value = this.filters.costMax;
    }
    
    if (urlParams.has('sort')) {
      const [sortBy, sortOrder] = urlParams.get('sort').split('_');
      this.sortBy = sortBy;
      this.sortOrder = sortOrder;
      const sortSelect = document.getElementById('sort-select');
      if (sortSelect) sortSelect.value = urlParams.get('sort');
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
    if (this.filters.type) params.set('type', this.filters.type);
    if (this.filters.district) params.set('district', this.filters.district);
    if (this.filters.costMin) params.set('costMin', this.filters.costMin);
    if (this.filters.costMax) params.set('costMax', this.filters.costMax);
    if (this.sortBy !== 'nazwa' || this.sortOrder !== 'asc') {
      params.set('sort', `${this.sortBy}_${this.sortOrder}`);
    }
    
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

// Initialize list page when DOM is loaded
let listPage;
document.addEventListener('DOMContentLoaded', () => {
  listPage = new ListPage();
});

// Export for global access
window.listPage = listPage;