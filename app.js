/**
 * AURA & MAISON - MENÚ DIGITAL CLIENTE (app.js)
 * Renderiza la experiencia inmersiva del menú basada en la Base de Datos Local (db.js).
 * Sin elementos transaccionales (no pedidos / no mozo).
 */

import { BUSINESS_PROFILES } from './menuData.js';
import { db } from './db.js';

// ==========================================
// 1. ESTADO GLOBAL DE LA VISTA
// ==========================================
const profileId = document.documentElement.dataset.profile || 'restaurant';

const state = {
  profileId: profileId,
  activeCategory: 'all',
  searchQuery: '',
  activeDietaryFilters: new Set(),
  currentViewMode: 'visual', // 'visual' | 'compact'
  selectedDishForModal: null,
  videoObserver: null
};

// ==========================================
// 2. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initVideoObserver();
  setupEventListeners();
  renderApp();
});

/**
 * Inicializa IntersectionObserver para reproducción diferida de micro-videos (60 FPS)
 */
function initVideoObserver() {
  state.videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.25 });
}

/**
 * Configuración de escuchadores de eventos DOM
 */
function setupEventListeners() {
  // Search Input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderDishesList();
    });
  }

  // Dietary Chips
  document.querySelectorAll('.chip-filter').forEach(chip => {
    chip.addEventListener('click', () => {
      const filterKey = chip.dataset.filter;
      if (state.activeDietaryFilters.has(filterKey)) {
        state.activeDietaryFilters.delete(filterKey);
        chip.classList.remove('active');
      } else {
        state.activeDietaryFilters.add(filterKey);
        chip.classList.add('active');
      }
      renderDishesList();
    });
  });

  // View Mode Switches
  const btnViewVisual = document.getElementById('btnViewVisual');
  const btnViewCompact = document.getElementById('btnViewCompact');

  if (btnViewVisual && btnViewCompact) {
    btnViewVisual.addEventListener('click', () => {
      state.currentViewMode = 'visual';
      btnViewVisual.classList.add('active');
      btnViewCompact.classList.remove('active');
      renderDishesList();
    });

    btnViewCompact.addEventListener('click', () => {
      state.currentViewMode = 'compact';
      btnViewCompact.classList.add('active');
      btnViewVisual.classList.remove('active');
      renderDishesList();
    });
  }

  // Modal Closers
  const btnCloseModal = document.getElementById('btnCloseDishModal');
  const modalBackdrop = document.getElementById('dishModalBackdrop');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeDishModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeDishModal);
}

// ==========================================
// 3. RENDERIZADO DE INTERFAZ
// ==========================================
function renderApp() {
  const defaultProfile = state.profileId === 'restaurant' ? BUSINESS_PROFILES.RESTAURANT : BUSINESS_PROFILES.BAKERY_CAFE;
  const themeConfig = db.getThemeConfig(state.profileId);

  // Apply custom accent color if saved
  if (themeConfig.accentColor) {
    document.documentElement.style.setProperty('--accent-gold', themeConfig.accentColor);
  }

  // 1. Render Header Brand Info
  const brandName = themeConfig.name || defaultProfile.name;
  const brandTagline = themeConfig.tagline || defaultProfile.tagline;

  const logoEl = document.getElementById('brandLogoIcon');
  const titleEl = document.getElementById('brandTitle');
  const taglineEl = document.getElementById('brandTagline');

  if (logoEl) logoEl.textContent = brandName.charAt(0);
  if (titleEl) titleEl.textContent = brandName;
  if (taglineEl) taglineEl.textContent = brandTagline;

  // 2. Render Promo Banner
  renderPromoBanner();

  // 3. Render "Los Más Elegidos" Horizontal Carousel
  renderFeaturedCarousel();

  // 4. Render Categories Navigation
  renderCategoriesNav(defaultProfile.categories);

  // 5. Render Dishes List
  renderDishesList();

  // Refresh icons
  if (window.lucide) window.lucide.createIcons();
}

let promoCarouselTimer = null;
let currentPromoSlideIndex = 0;

/**
 * Renderiza el Carrusel de Banners Promocionales (Promociones Bancarias, Happy Hour, Especiales)
 */
function renderPromoBanner() {
  const container = document.getElementById('promoBannerContainer');
  if (!container) return;

  if (promoCarouselTimer) {
    clearInterval(promoCarouselTimer);
    promoCarouselTimer = null;
  }

  const banners = db.getPromoBanners(state.profileId).filter(b => b.enabled !== false);
  if (!banners || banners.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="promo-carousel-container">
      <div class="promo-carousel-track" id="promoCarouselTrack">
        ${banners.map((b, idx) => `
          <div class="promo-slide" data-index="${idx}">
            <img src="${b.image || 'assets/images/specialty_coffee.png'}" alt="Banner Promocional" class="promo-slide-img" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        `).join('')}
      </div>

      ${banners.length > 1 ? `
        <button class="promo-nav-btn promo-nav-prev" id="btnPromoPrev" aria-label="Anterior"><i data-lucide="chevron-left"></i></button>
        <button class="promo-nav-btn promo-nav-next" id="btnPromoNext" aria-label="Siguiente"><i data-lucide="chevron-right"></i></button>
        <div class="promo-carousel-dots" id="promoCarouselDots">
          ${banners.map((_, idx) => `<div class="promo-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`).join('')}
        </div>
      ` : ''}
    </div>
  `;

  if (banners.length > 1) {
    const track = document.getElementById('promoCarouselTrack');
    const dots = document.querySelectorAll('.promo-dot');
    currentPromoSlideIndex = 0;

    const goToSlide = (index) => {
      currentPromoSlideIndex = (index + banners.length) % banners.length;
      if (track) track.style.transform = `translateX(-${currentPromoSlideIndex * 100}%)`;
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentPromoSlideIndex);
      });
    };

    document.getElementById('btnPromoPrev')?.addEventListener('click', () => goToSlide(currentPromoSlideIndex - 1));
    document.getElementById('btnPromoNext')?.addEventListener('click', () => goToSlide(currentPromoSlideIndex + 1));
    dots.forEach(dot => {
      dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index)));
    });

    // Auto slide cada 5 segundos
    promoCarouselTimer = setInterval(() => {
      goToSlide(currentPromoSlideIndex + 1);
    }, 5000);
  }

  if (window.lucide) window.lucide.createIcons();
}

function getGlobalCurrencySymbol() {
  const themeConfig = db.getThemeConfig(state.profileId);
  return themeConfig?.currencySymbol || '$';
}

function formatPrice(amount, symbol) {
  if (amount === undefined || amount === null || isNaN(amount)) return '';
  const currSymbol = symbol || getGlobalCurrencySymbol();
  return `${currSymbol} ${Number(amount).toLocaleString('es-AR')}`;
}

/**
 * Renderiza el Carrusel Horizontal "Los Más Elegidos"
 */
function renderFeaturedCarousel() {
  const section = document.getElementById('featuredSection');
  const carousel = document.getElementById('featuredCarousel');
  if (!section || !carousel) return;

  const featuredItems = db.getFeaturedItems(state.profileId);
  if (featuredItems.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  carousel.innerHTML = '';

  const currSymbol = getGlobalCurrencySymbol();

  featuredItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'featured-card';

    const formattedPrice = formatPrice(item.price, currSymbol);
    const rating = item.rating || 4.8;

    const prepTime = item.prepTime || "20 min";

    card.innerHTML = `
      <div class="featured-card-media">
        <img src="${item.media?.heroImage || 'assets/images/fresh_salmon.png'}" alt="${item.name}" loading="lazy">
        <div class="card-meta-badges">
          <div class="time-badge">
            <i data-lucide="clock" style="width:11px;height:11px;"></i> ${prepTime}
          </div>
          <div class="rating-badge">
            <i data-lucide="star" style="width:11px;height:11px;fill:#d97706;color:#d97706;"></i> ${rating}
          </div>
        </div>
      </div>
      <div class="featured-card-body">
        <h4>${item.name}</h4>
        <span class="featured-card-price">${formattedPrice}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      openDishModal(item);
    });

    carousel.appendChild(card);
  });
}

/**
 * Renderiza la barra horizontal de categorías
 */
function renderCategoriesNav(categories) {
  const navContainer = document.getElementById('categoryNavList');
  if (!navContainer) return;

  navContainer.innerHTML = '';

  categories.forEach(cat => {
    const button = document.createElement('button');
    button.className = `cat-pill ${state.activeCategory === cat.id ? 'active' : ''}`;
    button.dataset.catId = cat.id;

    button.innerHTML = `
      <i data-lucide="${cat.icon || 'sparkles'}"></i>
      <span>${cat.name}</span>
    `;

    button.addEventListener('click', () => {
      state.activeCategory = cat.id;
      document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      
      const catTitleEl = document.getElementById('currentCategoryTitle');
      if (catTitleEl) catTitleEl.textContent = cat.name;

      renderDishesList();
    });

    navContainer.appendChild(button);
  });
}

/**
 * Renderiza la lista de platos leídos desde la Base de Datos Local (db.js)
 */
function renderDishesList() {
  const container = document.getElementById('dishesContainer');
  if (!container) return;

  container.innerHTML = '';

  // Configurar clase del contenedor según el modo de vista
  container.className = state.currentViewMode === 'visual' ? 'visual-grid' : 'compact-list';

  // Cargar platos desde db.js
  const allProfileItems = db.getItemsByProfile(state.profileId);

  // Filtrado
  const filteredDishes = allProfileItems.filter(dish => {
    // Categoría
    if (state.activeCategory !== 'all' && dish.category !== state.activeCategory) return false;

    // Búsqueda por Texto
    if (state.searchQuery) {
      const nameMatch = dish.name.toLowerCase().includes(state.searchQuery);
      const descMatch = (dish.shortDescription || '').toLowerCase().includes(state.searchQuery);
      const ingredientMatch = (dish.layersOrIngredients || []).some(ing => ing.name.toLowerCase().includes(state.searchQuery));
      if (!nameMatch && !descMatch && !ingredientMatch) return false;
    }

    // Banderas Dietéticas
    for (let filterKey of state.activeDietaryFilters) {
      const chipEl = document.querySelector(`.chip-filter[data-filter="${filterKey}"]`);
      const isInverted = chipEl && chipEl.dataset.invert === "true";
      
      if (isInverted) {
        if (dish.dietaryFlags && dish.dietaryFlags[filterKey] === true) return false;
      } else {
        if (!dish.dietaryFlags || dish.dietaryFlags[filterKey] !== true) return false;
      }
    }

    return true;
  });

  if (filteredDishes.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i data-lucide="utensils" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
        <h3 style="font-size: 1.1rem; margin-bottom: 4px;">No se encontraron opciones</h3>
        <p style="font-size: 0.85rem;">Prueba ajustar los filtros dietéticos o el término de búsqueda.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Renderizado según Modo de Vista
  filteredDishes.forEach(dish => {
    if (state.currentViewMode === 'visual') {
      container.appendChild(createVisualCard(dish));
    } else {
      container.appendChild(createCompactCard(dish));
    }
  });

  // Observar videos para reproducción eficiente
  document.querySelectorAll('video[data-lazy-video]').forEach(v => {
    state.videoObserver.observe(v);
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Crea la tarjeta en Modo Experiencia Visual (SIN botón de añadir)
 */
function createVisualCard(dish) {
  const card = document.createElement('article');
  card.className = 'dish-card-visual';

  const currSymbol = getGlobalCurrencySymbol();
  const formattedPrice = formatPrice(dish.price, currSymbol);
  const hasVideo = !!dish.media?.videoLoopUrl;
  const hasAR = !!dish.media?.model3dUrl;

  const mediaHTML = hasVideo ? `
    <video data-lazy-video src="${dish.media.videoLoopUrl}" poster="${dish.media.heroImage || ''}" loop muted playsinline aria-label="${dish.name} video"></video>
    <div class="badge-video" title="Micro-video de cocción"><i data-lucide="play" style="width:12px;height:12px;"></i></div>
  ` : `
    <img src="${dish.media?.heroImage || 'assets/images/wagyu_ribeye.png'}" alt="${dish.name}" loading="lazy">
  `;

  const badgesHTML = `
    <div class="badge-container">
      ${dish.isChefSpecial ? `<span class="badge badge-chef">Sugerencia Chef</span>` : ''}
      ${hasAR ? `<span class="badge badge-ar"><i data-lucide="box" style="width:12px;height:12px;"></i> 3D AR</span>` : ''}
    </div>
  `;

  const dietaryTags = [];
  if (dish.dietaryFlags?.isGlutenFree) dietaryTags.push('Sin TACC');
  if (dish.dietaryFlags?.isVegan) dietaryTags.push('Vegano');
  if (dish.dietaryFlags?.isVegetarian) dietaryTags.push('Vegetariano');
  if (dish.dietaryFlags && !dish.dietaryFlags.containsDairy) dietaryTags.push('Sin Lactosa');

  const tagsHTML = dietaryTags.map(t => `<span class="tag-diet">${t}</span>`).join('');

  const unavailableOverlay = !dish.isAvailable ? `
    <div class="card-unavailable-overlay">
      <span>Agotado Temporalmente</span>
      <p style="font-size: 0.75rem; margin-top: 6px;">Consulte con su mozo disponibilidad próxima</p>
    </div>
  ` : '';

  const prepTime = dish.prepTime || "20 min";
  const ratingHTML = `
    <div class="card-meta-badges">
      <div class="time-badge">
        <i data-lucide="clock" style="width:11px;height:11px;"></i> ${prepTime}
      </div>
      <div class="rating-badge">
        <i data-lucide="star" style="width:11px;height:11px;fill:#d97706;color:#d97706;"></i> ${dish.rating || 4.8}
      </div>
    </div>
  `;

  let variationsHTML = '';
  if (dish.hasVariations && dish.variations && dish.variations.length > 0) {
    variationsHTML = `
      <div class="item-variations-container" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
        ${dish.variations.map((v, idx) => `
          <button type="button" class="variation-pill ${idx === 0 ? 'active' : ''}" data-price="${v.price}">
            <span>${v.name}</span>
            <span style="font-weight:700;">${formatPrice(v.price, currSymbol)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  card.innerHTML = `
    ${unavailableOverlay}
    <div class="card-media-box">
      ${badgesHTML}
      ${mediaHTML}
      ${ratingHTML}
    </div>
    <div class="card-body">
      <div class="card-title-row">
        <h3>${dish.name}</h3>
        <span class="card-price">${formattedPrice}</span>
      </div>
      <p class="card-description">${dish.shortDescription || ''}</p>

      ${variationsHTML}

      <div class="dietary-tags-row" style="margin-top: 8px;">
        ${tagsHTML}
      </div>

      <div class="card-footer-actions" style="justify-content: flex-end;">
        <button class="btn-detail btn-open-detail" style="width: 100%; justify-content: center; padding: 10px; background: var(--bg-surface-elevated); border-radius: var(--radius-pill); border: 1px solid var(--border-color);">
          <i data-lucide="eye" style="width:16px;height:16px;"></i> Ver Detalles e Ingredientes
        </button>
      </div>
    </div>
  `;

  // Variation pills listener
  card.querySelectorAll('.variation-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      card.querySelectorAll('.variation-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const pVal = pill.dataset.price;
      const priceEl = card.querySelector('.card-price');
      if (priceEl && pVal) {
        priceEl.textContent = formatPrice(pVal, currSymbol);
      }
    });
  });

  // Listeners
  card.querySelector('.btn-open-detail').addEventListener('click', (e) => {
    e.stopPropagation();
    openDishModal(dish);
  });

  card.querySelector('.card-media-box').addEventListener('click', () => {
    openDishModal(dish);
  });

  return card;
}

/**
 * Crea la tarjeta en Modo Lista Compacta (SIN botón de añadir)
 */
function createCompactCard(dish) {
  const card = document.createElement('article');
  card.className = 'dish-card-compact';

  const currSymbol = getGlobalCurrencySymbol();
  const formattedPrice = formatPrice(dish.price, currSymbol);

  card.innerHTML = `
    <img src="${dish.media?.heroImage || 'assets/images/wagyu_ribeye.png'}" alt="${dish.name}" class="compact-thumb" loading="lazy">
    <div class="compact-info">
      <h4>${dish.name}</h4>
      <p>${dish.shortDescription || ''}</p>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
      <span class="compact-price">${formattedPrice}</span>
      ${!dish.isAvailable ? `<span style="font-size:0.7rem;color:var(--status-out-text);font-weight:700;">Agotado</span>` : ''}
    </div>
  `;

  card.addEventListener('click', () => {
    openDishModal(dish);
  });

  return card;
}

// ==========================================
// 4. MODAL BOTTOM SHEET DE DETALLE
// ==========================================
function openDishModal(dish) {
  state.selectedDishForModal = dish;

  const currSymbol = getGlobalCurrencySymbol();
  const formattedPrice = formatPrice(dish.price, currSymbol);

  document.getElementById('modalDishTitle').textContent = dish.name;
  document.getElementById('modalDishPrice').textContent = formattedPrice;
  document.getElementById('modalDishStory').textContent = dish.fullStory || dish.shortDescription || '';

  // Render Variations if present
  const modalVariationsContainer = document.getElementById('modalVariationsContainer');
  if (modalVariationsContainer) {
    if (dish.hasVariations && dish.variations && dish.variations.length > 0) {
      modalVariationsContainer.style.display = 'block';
      modalVariationsContainer.innerHTML = `
        <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px;">Seleccionar Tamaños / Opciones</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${dish.variations.map((v, idx) => `
            <button type="button" class="variation-pill ${idx === 0 ? 'active' : ''}" data-price="${v.price}">
              <span>${v.name}</span>
              <span style="font-weight:700;">${formatPrice(v.price, currSymbol)}</span>
            </button>
          `).join('')}
        </div>
      `;
      modalVariationsContainer.querySelectorAll('.variation-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          modalVariationsContainer.querySelectorAll('.variation-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const pVal = pill.dataset.price;
          const priceEl = document.getElementById('modalDishPrice');
          if (priceEl && pVal) {
            priceEl.textContent = formatPrice(pVal, currSymbol);
          }
        });
      });
    } else {
      modalVariationsContainer.style.display = 'none';
      modalVariationsContainer.innerHTML = '';
    }
  }
  document.getElementById('modalDishStory').textContent = dish.fullStory || dish.shortDescription || '';

  // Render Hero Media
  const mediaContainer = document.getElementById('modalHeroMediaContainer');
  const closeBtn = mediaContainer.querySelector('.btn-close-sheet');
  mediaContainer.innerHTML = '';
  mediaContainer.appendChild(closeBtn);

  if (dish.media?.videoLoopUrl) {
    const video = document.createElement('video');
    video.src = dish.media.videoLoopUrl;
    video.poster = dish.media.heroImage || '';
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    mediaContainer.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = dish.media?.heroImage || 'assets/images/wagyu_ribeye.png';
    img.alt = dish.name;
    mediaContainer.appendChild(img);
  }

  // Render Dietary Badges
  const badgesContainer = document.getElementById('modalDietaryBadges');
  badgesContainer.innerHTML = '';
  if (dish.dietaryFlags?.isGlutenFree) badgesContainer.innerHTML += `<span class="tag-diet">🌾 Sin TACC</span>`;
  if (dish.dietaryFlags?.isVegan) badgesContainer.innerHTML += `<span class="tag-diet">🌱 Vegano</span>`;
  if (dish.dietaryFlags?.isVegetarian) badgesContainer.innerHTML += `<span class="tag-diet">🥦 Vegetariano</span>`;
  if (dish.dietaryFlags && !dish.dietaryFlags.containsDairy) badgesContainer.innerHTML += `<span class="tag-diet">🧀 Sin Lactosa</span>`;
  if (dish.dietaryFlags && !dish.dietaryFlags.containsNuts) badgesContainer.innerHTML += `<span class="tag-diet">🥜 Sin Frutos Secos</span>`;

  // Render WebAR 3D Model Button
  const arContainer = document.getElementById('arButtonContainer');
  arContainer.innerHTML = '';
  if (dish.media?.model3dUrl) {
    const arBtn = document.createElement('button');
    arBtn.className = 'btn-ar-launch';
    arBtn.innerHTML = `<i data-lucide="box"></i> Ver Plato en Realidad Aumentada 3D`;
    arBtn.addEventListener('click', () => {
      openWebARViewer(dish.media.model3dUrl, dish.name);
    });
    arContainer.appendChild(arBtn);
  }

  // Render Interactive Ingredients / Layers
  const layersContainer = document.getElementById('modalLayersList');
  layersContainer.innerHTML = '';

  if (dish.layersOrIngredients && dish.layersOrIngredients.length > 0) {
    dish.layersOrIngredients.forEach(layer => {
      const item = document.createElement('div');
      item.className = 'layer-item';
      item.innerHTML = `
        <div class="layer-header">
          <div class="layer-header-left">
            <div class="layer-icon"><i data-lucide="${layer.icon || 'dot'}"></i></div>
            <span>${layer.name}</span>
          </div>
          <i data-lucide="chevron-down" style="width:16px;height:16px;color:var(--text-muted);"></i>
        </div>
        <div class="layer-detail-box">
          <p>${layer.description}</p>
          ${layer.allergenWarning ? `<span class="allergen-warning-badge">⚠️ ${layer.allergenWarning}</span>` : ''}
        </div>
      `;

      item.addEventListener('click', () => {
        item.classList.toggle('expanded');
      });

      layersContainer.appendChild(item);
    });
  } else {
    layersContainer.innerHTML = `<p style="font-size:0.85rem;color:var(--text-muted);">Sin desglose de ingredientes especificado.</p>`;
  }

  // Render Pairing Suggestion
  const pairingContainer = document.getElementById('modalPairingContainer');
  pairingContainer.innerHTML = '';

  if (dish.pairingSuggestion && dish.pairingSuggestion.name) {
    const pairing = dish.pairingSuggestion;
    pairingContainer.innerHTML = `
      <div class="pairing-card">
        <h4><i data-lucide="glass-water" style="width:14px;height:14px;vertical-align:middle;"></i> Maridaje Recomendado</h4>
        <div class="pairing-title-row">
          <strong>${pairing.name}</strong>
          <span style="font-weight:700;color:var(--accent-gold);">${pairing.formattedPrice || '$ ' + pairing.price}</span>
        </div>
        <p class="pairing-reason">${pairing.reason}</p>
      </div>
    `;
  }

  // Open Backdrop & Sheet
  document.getElementById('dishModalBackdrop').classList.add('open');
  document.getElementById('dishModalSheet').classList.add('open');

  if (window.lucide) window.lucide.createIcons();
}

function closeDishModal() {
  const backdrop = document.getElementById('dishModalBackdrop');
  const sheet = document.getElementById('dishModalSheet');
  if (backdrop) backdrop.classList.remove('open');
  if (sheet) sheet.classList.remove('open');
}

/**
 * Visor WebAR 3D
 */
function openWebARViewer(modelUrl, title) {
  const arOverlay = document.createElement('div');
  arOverlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 350;
    display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;
  `;

  arOverlay.innerHTML = `
    <button class="btn-close-sheet" style="top:20px;right:20px;" id="btnCloseAR"><i data-lucide="x"></i></button>
    <h3 style="color:#fff;margin-bottom:16px;font-family:var(--font-heading);">${title} (Vista 3D AR)</h3>
    <model-viewer src="${modelUrl}" ar ar-modes="webxr scene-viewer quick-look" camera-controls touch-action="pan-y" alt="Modelo 3D del plato" style="width: 100%; height: 70vh; border-radius: 16px; background: #16161a;">
    </model-viewer>
    <p style="color:#a0a0ab;font-size:0.8rem;margin-top:12px;">En dispositivos iOS / Android compatibles, presione el icono 3D para proyectar en su mesa.</p>
  `;

  document.body.appendChild(arOverlay);
  if (window.lucide) window.lucide.createIcons();

  document.getElementById('btnCloseAR').addEventListener('click', () => {
    arOverlay.remove();
  });
}
