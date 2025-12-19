// app.js — Enhanced UI logic, auth, rendering, posting
(function(){
  'use strict';

  /* ========== CONFIG & CONSTANTS ========== */
  const CONFIG = {
    PLACEHOLDER_IMAGE: 'https://images.unsplash.com/photo-1613553507747-5f8d62ad5904?w=600&h=400&fit=crop&q=80',
    PLACEHOLDER_DETAIL: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=800&h=600&fit=crop&q=80',
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 400,
    API_TIMEOUT: 5000
  };

  /* ========== CORE UTILITIES ========== */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  
  // Enhanced debounce
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  // Loading states
  function showLoading(element) {
    element.classList.add('loading');
    return () => element.classList.remove('loading');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        ${message}
      </div>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /* ========== ENHANCED UTILITY FUNCTIONS ========== */
  function fmtPrice(n) { 
    if (!n) return "—";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(n);
  }

  function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function el(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  /* ========== DATA MANAGEMENT ========== */
  class DataStore {
    static load() {
      try {
        return window.BAZAAR.load();
      } catch (error) {
        console.error('Failed to load data:', error);
        return { homes: [], cars: [] };
      }
    }

    static save(data) {
      try {
        window.BAZAAR.save(data);
        return true;
      } catch (error) {
        console.error('Failed to save data:', error);
        return false;
      }
    }

    static loadUsers() {
      try {
        return window.BAZAAR.loadUsers();
      } catch (error) {
        console.error('Failed to load users:', error);
        return [];
      }
    }

    static saveUsers(users) {
      try {
        window.BAZAAR.saveUsers(users);
        return true;
      } catch (error) {
        console.error('Failed to save users:', error);
        return false;
      }
    }

    static getSession() {
      try {
        return window.BAZAAR.getSession();
      } catch (error) {
        console.error('Failed to get session:', error);
        return null;
      }
    }

    static setSession(email) {
      try {
        window.BAZAAR.setSession(email);
        return true;
      } catch (error) {
        console.error('Failed to set session:', error);
        return false;
      }
    }

    static clearSession() {
      try {
        window.BAZAAR.clearSession();
        return true;
      } catch (error) {
        console.error('Failed to clear session:', error);
        return false;
      }
    }
  }

  /* ========== UI COMPONENTS ========== */
  class CardComponent {
    static create(item, type) {
      const isHome = type === 'home';
      const href = `listing.html?id=${encodeURIComponent(item.id)}&type=${isHome ? 'home' : 'car'}`;
      const img = item.image || CONFIG.PLACEHOLDER_IMAGE;
      
      const card = el(`
        <article class="card ${item.featured ? 'featured' : ''}">
          ${item.featured ? '<div class="card-badge">Featured</div>' : ''}
          <div class="card-image">
            <img src="${img}" alt="${item.title}" loading="lazy">
            <div class="image-overlay">
              <span class="quick-view">Quick View</span>
            </div>
          </div>
          <div class="card-content">
            <div class="price-wrapper">
              <div class="price">${fmtPrice(item.price)}</div>
              ${isHome ? `<div class="property-meta">
                <span class="beds">${item.bedrooms || 0} Beds</span>
                <span class="baths">${item.bathrooms || 0} Baths</span>
              </div>` : ''}
            </div>
            <h3 class="card-title">${item.title}</h3>
            <div class="meta">
              <span class="location">${item.city || 'Unknown Location'}</span>
              <span class="type">${isHome ? 
                (item.propertyType || 'Property') : 
                (item.year ? `${item.year} ` : '') + (item.make || '') + ' ' + (item.model || '')}
              </span>
            </div>
            <p class="description">${item.description ? 
              (item.description.substring(0, 100) + (item.description.length > 100 ? '...' : '')) : 
              'No description available'}</p>
            <div class="card-footer">
              <div class="owner">
                <span class="owner-icon">👤</span>
                <span class="owner-name">${item.ownerEmail ? item.ownerEmail.split('@')[0] : 'Private'}</span>
              </div>
              <div class="actions">
                <button class="btn small ghost save-btn" data-id="${item.id}" data-type="${type}">
                  <span class="btn-icon">♡</span>
                </button>
                <a class="btn small ghost" href="${href}">View Details</a>
              </div>
            </div>
          </div>
        </article>
      `);

      // Add hover effect
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
      });

      // Quick view modal
      const imageOverlay = card.querySelector('.image-overlay');
      imageOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        this.showQuickView(item, type);
      });

      // Save button
      const saveBtn = card.querySelector('.save-btn');
      saveBtn.addEventListener('click', () => {
        this.toggleSave(item.id, type, saveBtn);
      });

      return card;
    }

    static showQuickView(item, type) {
      const modal = el(`
        <div class="modal">
          <div class="modal-backdrop"></div>
          <div class="modal-content">
            <div class="modal-header">
              <h3>${item.title}</h3>
              <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
              <img src="${item.image || CONFIG.PLACEHOLDER_IMAGE}" alt="${item.title}">
              <div class="modal-details">
                <div class="price">${fmtPrice(item.price)}</div>
                <div class="meta">${item.city}</div>
                <p>${item.description || 'No description available'}</p>
                <div class="modal-actions">
                  <a class="btn primary" href="listing.html?id=${item.id}&type=${type}">View Full Details</a>
                  ${item.phone ? `<a class="btn ghost" href="tel:${item.phone}">Call Owner</a>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      `);

      document.body.appendChild(modal);
      modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.remove());
      modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
      
      // Close on ESC
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', escHandler);
        }
      });
    }

    static toggleSave(itemId, type, button) {
      const session = DataStore.getSession();
      if (!session) {
        showToast('Please sign in to save listings', 'info');
        return;
      }

      let saved = JSON.parse(localStorage.getItem('saved_listings') || '{}');
      const key = `${type}_${itemId}`;
      
      if (saved[key]) {
        delete saved[key];
        button.innerHTML = '<span class="btn-icon">♡</span>';
        showToast('Removed from saved', 'info');
      } else {
        saved[key] = { id: itemId, type, timestamp: Date.now() };
        button.innerHTML = '<span class="btn-icon" style="color: var(--accent)">♥</span>';
        showToast('Saved to favorites', 'success');
      }
      
      localStorage.setItem('saved_listings', JSON.stringify(saved));
    }
  }

  /* ========== HEADER MANAGEMENT ========== */
  class HeaderManager {
    static render() {
      const area = document.getElementById('headerUserArea');
      if (!area) return;

      const session = DataStore.getSession();
      
      if (session?.email) {
        area.innerHTML = `
          <div class="user-dropdown">
            <button class="user-trigger">
              <span class="user-avatar">${session.email.charAt(0).toUpperCase()}</span>
              <span class="user-email">${session.email}</span>
              <span class="dropdown-arrow">▼</span>
            </button>
            <div class="dropdown-menu">
              <a href="account.html" class="dropdown-item">
                <span class="item-icon">👤</span> Account
              </a>
              <a href="#saved" class="dropdown-item">
                <span class="item-icon">♥</span> Saved Items
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item logout-btn">
                <span class="item-icon">🚪</span> Sign Out
              </button>
            </div>
          </div>
        `;

        // Setup dropdown
        const trigger = area.querySelector('.user-trigger');
        const menu = area.querySelector('.dropdown-menu');
        
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
          menu.classList.remove('show');
        });

        // Logout handler
        area.querySelector('.logout-btn').addEventListener('click', () => {
          DataStore.clearSession();
          this.render();
          showToast('Signed out successfully', 'success');
          setTimeout(() => window.location.href = 'index.html', 1000);
        });
      } else {
        area.innerHTML = `
          <a class="btn small ghost" href="account.html?mode=signin">
            <span class="btn-icon">👤</span> Sign In
          </a>
          <a class="btn small primary" href="account.html?mode=signup">
            <span class="btn-icon">✨</span> Sign Up
          </a>
        `;
      }
    }
  }

  /* ========== SEARCH & FILTER ========== */
  class SearchManager {
    constructor(gridId, filterId, type) {
      this.grid = document.getElementById(gridId);
      this.form = document.getElementById(filterId);
      this.type = type;
      this.init();
    }

    init() {
      if (!this.grid || !this.form) return;

      // Real-time filtering
      const debouncedApply = debounce(() => this.apply(), CONFIG.DEBOUNCE_DELAY);
      this.form.addEventListener('input', debouncedApply);
      this.form.addEventListener('change', debouncedApply);

      // Sort functionality
      const sortSelect = this.form.querySelector('[name="sort"]');
      if (sortSelect) {
        sortSelect.addEventListener('change', () => this.apply());
      }

      // Clear filters
      const clearBtn = this.form.querySelector('.clear-filters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.form.reset();
          this.apply();
        });
      }

      this.apply();
    }

    apply() {
      const hideLoading = showLoading(this.grid);
      const f = new FormData(this.form);
      
      setTimeout(() => {
        const data = DataStore.load();
        const list = this.type === 'home' ? data.homes || [] : data.cars || [];
        
        let filtered = list.filter(item => this.filterItem(item, f));
        filtered = this.sortItems(filtered, f.get('sort'));
        
        this.renderGrid(filtered);
        this.updateResultCount(filtered.length);
        hideLoading();
      }, 200); // Simulate loading
    }

    filterItem(item, formData) {
      const city = formData.get('city');
      const maxPrice = Number(formData.get('maxPrice') || 0);
      const query = (formData.get('q') || '').toLowerCase();
      
      if (city && item.city !== city) return false;
      if (maxPrice && item.price > maxPrice) return false;
      
      if (query) {
        const searchable = `${item.title} ${item.description} ${item.city} ${item.propertyType || ''} ${item.make || ''} ${item.model || ''}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      // Type-specific filters
      if (this.type === 'home') {
        const propertyType = formData.get('propertyType');
        const minBeds = Number(formData.get('minBeds') || 0);
        const minBaths = Number(formData.get('minBaths') || 0);
        
        if (propertyType && item.propertyType !== propertyType) return false;
        if (minBeds && item.bedrooms < minBeds) return false;
        if (minBaths && item.bathrooms < minBaths) return false;
      } else {
        const make = (formData.get('make') || '').toLowerCase();
        const model = (formData.get('model') || '').toLowerCase();
        const minYear = Number(formData.get('minYear') || 0);
        
        if (make && !(item.make || '').toLowerCase().includes(make)) return false;
        if (model && !(item.model || '').toLowerCase().includes(model)) return false;
        if (minYear && item.year < minYear) return false;
      }

      return true;
    }

    sortItems(items, sortBy) {
      const sorted = [...items];
      
      switch(sortBy) {
        case 'price_asc':
          return sorted.sort((a, b) => a.price - b.price);
        case 'price_desc':
          return sorted.sort((a, b) => b.price - a.price);
        case 'date_new':
          return sorted.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
        case 'date_old':
          return sorted.sort((a, b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
        default:
          return sorted;
      }
    }

    renderGrid(items) {
      this.grid.innerHTML = '';
      
      if (items.length === 0) {
        this.grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>No listings found</h3>
            <p>Try adjusting your filters or search terms</p>
            <button class="btn ghost clear-filters">Clear All Filters</button>
          </div>
        `;
        return;
      }

      items.forEach(item => {
        this.grid.appendChild(CardComponent.create(item, this.type));
      });
    }

    updateResultCount(count) {
      const countEl = document.getElementById('resultCount');
      if (countEl) {
        countEl.textContent = `${count} ${count === 1 ? 'result' : 'results'} found`;
      }
    }
  }

  /* ========== PAGE INITIALIZERS ========== */
  window.initIndex = function() {
    // Set current year
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // Initialize components
    HeaderManager.render();
    
    // Featured listings with skeleton loading
    const featuredGrid = document.getElementById('featuredGrid');
    if (featuredGrid) {
      // Show skeleton
      featuredGrid.innerHTML = Array(6).fill('<div class="card skeleton"></div>').join('');
      
      setTimeout(() => {
        const data = DataStore.load();
        const featured = [
          ...(data.homes || []).filter(x => x.featured).slice(0, 3),
          ...(data.cars || []).filter(x => x.featured).slice(0, 3)
        ];
        
        if (featured.length > 0) {
          featuredGrid.innerHTML = '';
          featured.forEach(item => {
            featuredGrid.appendChild(CardComponent.create(
              item, 
              item.propertyType ? 'home' : 'car'
            ));
          });
        } else {
          featuredGrid.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">⭐</div>
              <h3>No Featured Listings</h3>
              <p>Check back soon for featured properties and vehicles</p>
            </div>
          `;
        }
      }, 800);
    }

    // Stats animation
    const stats = document.querySelectorAll('.stat-number');
    stats.forEach(stat => {
      const target = parseInt(stat.textContent);
      let current = 0;
      const increment = target / 50;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        stat.textContent = Math.round(current).toLocaleString();
      }, 20);
    });
  };

  window.renderHomesPage = function() {
    HeaderManager.render();
    new SearchManager('homeGrid', 'homeFilters', 'home');
  };

  window.renderCarsPage = function() {
    HeaderManager.render();
    new SearchManager('carGrid', 'carFilters', 'car');
  };

  window.renderAddPage = function() {
    HeaderManager.render();
    const form = document.getElementById('addForm');
    if (!form) return;

    const homeFields = document.getElementById('homeFields');
    const carFields = document.getElementById('carFields');
    const priceInput = form.querySelector('input[name="price"]');
    const imageInput = form.querySelector('input[name="image"]');
    const imagePreview = document.getElementById('imagePreview');

    // Price formatting
    if (priceInput) {
      priceInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value) {
          value = parseInt(value).toLocaleString();
        }
        e.target.value = value;
      });
    }

    // Image preview
    if (imageInput && imagePreview) {
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            imagePreview.innerHTML = `
              <img src="${event.target.result}" alt="Preview">
              <button type="button" class="remove-image">×</button>
            `;
            imagePreview.classList.add('has-image');
            
            imagePreview.querySelector('.remove-image').addEventListener('click', () => {
              imageInput.value = '';
              imagePreview.innerHTML = '<div class="upload-placeholder">Upload Image</div>';
              imagePreview.classList.remove('has-image');
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Category toggle
    function toggleCategory() {
      const cat = form.category.value;
      homeFields.style.display = cat === 'home' ? 'flex' : 'none';
      carFields.style.display = cat === 'car' ? 'flex' : 'none';
      
      // Animate transition
      [homeFields, carFields].forEach(el => {
        el.style.opacity = '0';
        setTimeout(() => {
          el.style.opacity = '1';
        }, 10);
      });
    }

    form.category.addEventListener('change', toggleCategory);
    toggleCategory();

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating...';
      submitBtn.disabled = true;

      try {
        const formData = new FormData(form);
        const category = formData.get('category');
        const id = uid(category === 'home' ? 'h' : 'c');
        
        const base = {
          id,
          title: formData.get('title').trim(),
          city: formData.get('city'),
          price: parseInt(formData.get('price').replace(/\D/g, '') || '0'),
          description: formData.get('description').trim(),
          phone: formData.get('phone').trim(),
          whatsapp: formData.get('whatsapp').trim(),
          featured: formData.get('featured') === 'true',
          ownerEmail: (DataStore.getSession()?.email) || 'anonymous',
          dateAdded: new Date().toISOString(),
          views: 0,
          saves: 0
        };

        // Handle image upload
        const imageFile = imageInput?.files[0];
        if (imageFile) {
          // In a real app, you would upload to a server
          base.image = URL.createObjectURL(imageFile);
        }

        const data = DataStore.load();
        
        if (category === 'home') {
          const item = {
            ...base,
            propertyType: formData.get('propertyType'),
            bedrooms: parseInt(formData.get('bedrooms') || '0'),
            bathrooms: parseInt(formData.get('bathrooms') || '0'),
            area: parseInt(formData.get('area') || '0')
          };
          data.homes = data.homes || [];
          data.homes.unshift(item);
        } else {
          const item = {
            ...base,
            make: formData.get('make'),
            model: formData.get('model'),
            year: parseInt(formData.get('year') || '0'),
            mileage: parseInt(formData.get('mileage') || '0'),
            fuelType: formData.get('fuelType')
          };
          data.cars = data.cars || [];
          data.cars.unshift(item);
        }

        if (DataStore.save(data)) {
          showToast('Listing created successfully!', 'success');
          form.reset();
          toggleCategory();
          if (imagePreview) {
            imagePreview.innerHTML = '<div class="upload-placeholder">Upload Image</div>';
            imagePreview.classList.remove('has-image');
          }
          
          // Redirect after delay
          setTimeout(() => {
            window.location.href = category === 'home' ? 'homes.html' : 'cars.html';
          }, 1500);
        } else {
          throw new Error('Failed to save listing');
        }
      } catch (error) {
        console.error('Submission error:', error);
        showToast('Failed to create listing. Please try again.', 'error');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  };

  window.renderListingPage = function() {
    HeaderManager.render();
    const container = document.getElementById('listingDetail');
    if (!container) return;

    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const type = params.get('type');

    if (!id || !type) {
      container.innerHTML = '<div class="error-state">Invalid listing URL</div>';
      return;
    }

    // Show loading skeleton
    container.innerHTML = `
      <div class="detail skeleton">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-price"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text"></div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const data = DataStore.load();
      const list = type === 'home' ? data.homes : data.cars;
      const item = list?.find(x => x.id === id);

      if (!item) {
        container.innerHTML = `
          <div class="error-state">
            <div class="error-icon">🔍</div>
            <h3>Listing Not Found</h3>
            <p>The listing you're looking for doesn't exist or has been removed.</p>
            <a class="btn primary" href="${type === 'home' ? 'homes.html' : 'cars.html'}">
              Browse ${type === 'home' ? 'Homes' : 'Cars'}
            </a>
          </div>
        `;
        return;
      }

      // Increment view count
      item.views = (item.views || 0) + 1;
      DataStore.save(data);

      const isHome = type === 'home';
      const img = item.image || CONFIG.PLACEHOLDER_DETAIL;

      container.innerHTML = `
        <div class="detail">
          <div class="detail-gallery">
            <div class="main-image">
              <img src="${img}" alt="${item.title}" id="mainImage">
            </div>
            <div class="image-thumbnails">
              ${item.gallery ? item.gallery.map((imgSrc, i) => `
                <img src="${imgSrc}" alt="Image ${i + 1}" class="thumbnail ${i === 0 ? 'active' : ''}" 
                     onclick="document.getElementById('mainImage').src = this.src; 
                              document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                              this.classList.add('active')">
              `).join('') : ''}
            </div>
          </div>
          
          <div class="detail-content">
            <div class="detail-header">
              <div>
                <h1>${item.title}</h1>
                <div class="meta">
                  <span class="location">📍 ${item.city}</span>
                  <span class="views">👁️ ${item.views || 0} views</span>
                </div>
              </div>
              <button class="btn ghost save-listing" data-id="${id}" data-type="${type}">
                <span class="btn-icon">♡</span> Save
              </button>
            </div>
            
            <div class="price-section">
              <div class="price-large">${fmtPrice(item.price)}</div>
              ${isHome ? `
                <div class="property-stats">
                  <div class="stat">
                    <span class="stat-label">Beds</span>
                    <span class="stat-value">${item.bedrooms || '—'}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Baths</span>
                    <span class="stat-value">${item.bathrooms || '—'}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Type</span>
                    <span class="stat-value">${item.propertyType || '—'}</span>
                  </div>
                </div>
              ` : `
                <div class="vehicle-stats">
                  <div class="stat">
                    <span class="stat-label">Year</span>
                    <span class="stat-value">${item.year || '—'}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Make</span>
                    <span class="stat-value">${item.make || '—'}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Model</span>
                    <span class="stat-value">${item.model || '—'}</span>
                  </div>
                </div>
              `}
            </div>
            
            <div class="description-section">
              <h3>Description</h3>
              <p>${item.description || 'No description provided.'}</p>
            </div>
            
            <div class="contact-section">
              <h3>Contact Owner</h3>
              <div class="contact-methods">
                ${item.phone ? `
                  <a class="contact-method" href="tel:${item.phone}">
                    <span class="method-icon">📞</span>
                    <div>
                      <strong>Call</strong>
                      <span>${formatPhone(item.phone)}</span>
                    </div>
                  </a>
                ` : ''}
                ${item.whatsapp ? `
                  <a class="contact-method" href="https://wa.me/${item.whatsapp.replace(/\D/g, '')}" target="_blank">
                    <span class="method-icon">💬</span>
                    <div>
                      <strong>WhatsApp</strong>
                      <span>${formatPhone(item.whatsapp)}</span>
                    </div>
                  </a>
                ` : ''}
                <div class="contact-method">
                  <span class="method-icon">✉️</span>
                  <div>
                    <strong>Email</strong>
                    <span>${item.ownerEmail || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="action-buttons">
              <a class="btn primary" href="tel:${item.phone || ''}">
                <span class="btn-icon">📞</span> Call Now
              </a>
              ${item.whatsapp ? `
                <a class="btn ghost" href="https://wa.me/${item.whatsapp.replace(/\D/g, '')}" target="_blank">
                  <span class="btn-icon">💬</span> WhatsApp
                </a>
              ` : ''}
              <a class="btn ghost" href="${isHome ? 'homes.html' : 'cars.html'}">
                <span class="btn-icon">←</span> Back
              </a>
            </div>
            
            <div class="listing-footer">
              <div class="listing-id">Listing ID: ${item.id}</div>
              <div class="posted-date">Posted: ${new Date(item.dateAdded || Date.now()).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      `;

      // Save button functionality
      const saveBtn = container.querySelector('.save-listing');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          CardComponent.toggleSave(id, type, saveBtn);
        });
      }
    }, 500);
  };

  window.initAccount = function() {
    document.getElementById('year2').textContent = new Date().getFullYear();
    HeaderManager.render();

    const params = new URLSearchParams(location.search);
    const mode = params.get('mode') || 'signin';
    
    const authCard = document.getElementById('authCard');
    const profileCard = document.getElementById('profileCard');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubmit = document.getElementById('authSubmit');
    const switchAuth = document.getElementById('switchAuth');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileInfo = document.getElementById('profileInfo');
    const myListings = document.getElementById('myListings');

    let currentMode = mode;

    function updateAuthUI() {
      authTitle.textContent = currentMode === 'signin' ? 'Sign In' : 'Create Account';
      authSubmit.textContent = currentMode === 'signin' ? 'Sign In' : 'Create Account';
      switchAuth.textContent = currentMode === 'signin' 
        ? 'Need an account? Sign up' 
        : 'Have an account? Sign in';
      
      // Update form fields visibility
      const passwordConfirm = authForm.querySelector('[name="passwordConfirm"]');
      if (passwordConfirm) {
        passwordConfirm.closest('label').style.display = currentMode === 'signup' ? 'flex' : 'none';
      }
    }

    function showProfile() {
      const session = DataStore.getSession();
      if (!session) {
        authCard.style.display = '';
        profileCard.style.display = 'none';
        updateAuthUI();
        return;
      }

      authCard.style.display = 'none';
      profileCard.style.display = '';
      profileInfo.innerHTML = `
        <div class="profile-header">
          <div class="profile-avatar">${session.email.charAt(0).toUpperCase()}</div>
          <div>
            <h3>${session.email}</h3>
            <p class="meta">Member since ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      `;

      // Load user's listings
      const data = DataStore.load();
      const all = [
        ...(data.homes || []).filter(x => x.ownerEmail === session.email),
        ...(data.cars || []).filter(x => x.ownerEmail === session.email)
      ];

      if (all.length > 0) {
        myListings.innerHTML = '';
        all.forEach(item => {
          myListings.appendChild(CardComponent.create(
            item,
            item.propertyType ? 'home' : 'car'
          ));
        });
      } else {
        myListings.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h3>No Listings Yet</h3>
            <p>You haven't created any listings. Get started by posting your first property or vehicle!</p>
            <a class="btn primary" href="add.html">Create Listing</a>
          </div>
        `;
      }
    }

    // Switch between signin/signup
    switchAuth.addEventListener('click', (e) => {
      e.preventDefault();
      currentMode = currentMode === 'signin' ? 'signup' : 'signin';
      updateAuthUI();
      history.replaceState(null, '', `?mode=${currentMode}`);
    });

    // Form submission
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(authForm);
      const email = formData.get('email').trim().toLowerCase();
      const password = formData.get('password');
      const passwordConfirm = formData.get('passwordConfirm');

      // Validation
      if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
      }

      if (currentMode === 'signup') {
        if (password.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          return;
        }

      }

      // Loading state
      const originalText = authSubmit.textContent;
      authSubmit.textContent = 'Processing...';
      authSubmit.disabled = true;

      setTimeout(() => {
        const users = DataStore.loadUsers();
        
        if (currentMode === 'signin') {
          const user = users.find(x => x.email === email && x.password === password);
          if (!user) {
            showToast('Invalid email or password', 'error');
            authSubmit.textContent = originalText;
            authSubmit.disabled = false;
            return;
          }
        } else {
          if (users.find(x => x.email === email)) {
            showToast('Account already exists', 'error');
            authSubmit.textContent = originalText;
            authSubmit.disabled = false;
            return;
          }
          users.push({ email, password, name: email.split('@')[0], joined: new Date().toISOString() });
          DataStore.saveUsers(users);
        }

        DataStore.setSession(email);
        showToast(`Successfully ${currentMode === 'signin' ? 'signed in' : 'account created'}`, 'success');
        HeaderManager.render();
        showProfile();
        
        authSubmit.textContent = originalText;
        authSubmit.disabled = false;
      }, 1000);
    });

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        DataStore.clearSession();
        showToast('Signed out successfully', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      });
    }

    // Initial display
    showProfile();
  };

  /* ========== INITIALIZATION ========== */
  document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for new components
    const style = document.createElement('style');
    style.textContent = `
      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--glass);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius);
        padding: 1rem 1.5rem;
        transform: translateX(120%);
        transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        z-index: 1000;
      }
      .toast.show { transform: translateX(0); }
      .toast.success { border-left: 4px solid var(--accent); }
      .toast.error { border-left: 4px solid var(--danger); }
      .toast-content { display: flex; align-items: center; gap: 0.75rem; }
      
      .loading { position: relative; }
      .loading::after {
        content: '';
        position: absolute;
        top: 50%; left: 50%;
        width: 30px; height: 30px;
        border: 3px solid var(--glass-border);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      
      .user-dropdown { position: relative; }
      .user-trigger { 
        display: flex; align-items: center; gap: 0.75rem;
        background: var(--glass); padding: 0.5rem 1rem;
        border-radius: var(--radius); border: 1px solid var(--glass-border);
        cursor: pointer;
      }
      .user-avatar {
        width: 32px; height: 32px;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        border-radius: 50%; display: flex;
        align-items: center; justify-content: center;
        font-weight: bold;
      }
      .dropdown-menu {
        position: absolute; top: 100%; right: 0;
        margin-top: 0.5rem; min-width: 200px;
        background: var(--panel); border: 1px solid var(--glass-border);
        border-radius: var(--radius); display: none;
        backdrop-filter: blur(20px); z-index: 100;
      }
      .dropdown-menu.show { display: block; }
      .dropdown-item {
        display: flex; align-items: center; gap: 0.75rem;
        padding: 0.75rem 1rem; text-decoration: none;
        color: var(--text); transition: background 0.2s;
      }
      .dropdown-item:hover { background: var(--glass); }
      .dropdown-divider { height: 1px; background: var(--glass-border); margin: 0.5rem 0; }
      
      .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; }
      .modal-backdrop { position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.8); }
      .modal-content {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%); background: var(--panel);
        border-radius: var(--radius-lg); padding: 2rem;
        max-width: 800px; width: 90%; max-height: 90vh;
        overflow-y: auto; border: 1px solid var(--glass-border);
      }
      
      .empty-state { text-align: center; padding: 3rem 1rem; }
      .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
      
      .skeleton { background: linear-gradient(90deg, var(--glass) 25%, var(--glass-heavy) 50%, var(--glass) 75%); background-size: 200% 100%; animation: loading 1.5s infinite; }
      @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      
      .card-image { position: relative; overflow: hidden; }
      .image-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex;
        align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.3s; cursor: pointer;
      }
      .card:hover .image-overlay { opacity: 1; }
      .quick-view { background: var(--glass); padding: 0.5rem 1rem; border-radius: 20px; }
      
      .contact-method {
        display: flex; align-items: center; gap: 1rem;
        padding: 1rem; background: var(--glass);
        border-radius: var(--radius); margin-bottom: 0.75rem;
        text-decoration: none; color: var(--text);
      }
      .contact-method:hover { background: var(--glass-heavy); }
      .method-icon { font-size: 1.5rem; }
    `;
    document.head.appendChild(style);

    // Initialize based on current page
    const path = window.location.pathname;
    if (path.includes('homes.html')) window.renderHomesPage?.();
    else if (path.includes('cars.html')) window.renderCarsPage?.();
    else if (path.includes('add.html')) window.renderAddPage?.();
    else if (path.includes('listing.html')) window.renderListingPage?.();
    else if (path.includes('account.html')) window.initAccount?.();
    
    HeaderManager.render();
  });

  // Expose utilities globally
  window.fmtPrice = fmtPrice;
  window.CardComponent = CardComponent;
  window.DataStore = DataStore;
})();
