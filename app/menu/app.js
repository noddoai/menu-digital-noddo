/**
 * AURA & MAISON - MENÚ DIGITAL CLIENTE (app.js)
 * Renderiza la experiencia inmersiva del menú basada en la Base de Datos Local (db.js).
 * Sin elementos transaccionales (no pedidos / no mozo).
 */

import { BUSINESS_PROFILES } from '../shared/menuData.js';
import { db } from '../shared/db.js';
import { apiRequest } from '../shared/services/api-client.js';
import { resolveAssetUrl } from '../shared/utils/asset-url.js';

// ==========================================
// 1. ESTADO GLOBAL DE LA VISTA
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const profileFromUrl = urlParams.get('tenant') || urlParams.get('profile');
const profileId = profileFromUrl || document.documentElement.dataset.profile || 'restaurant';

const state = {
  profileId: profileId,
  activeCategory: 'all',
  searchQuery: '',
  activeDietaryFilters: new Set(),
  currentViewMode: 'visual', // 'visual' | 'compact'
  selectedDishForModal: null,
  videoObserver: null
};

function getProfileDef(pId) {
  if (!pId) return BUSINESS_PROFILES.RESTAURANT;
  const key = Object.keys(BUSINESS_PROFILES).find(k => BUSINESS_PROFILES[k].id === pId);
  if (key && BUSINESS_PROFILES[key]) return BUSINESS_PROFILES[key];
  if (pId === 'bakery_cafe' || pId.includes('cafe')) return BUSINESS_PROFILES.BAKERY_CAFE;
  if (pId === 'le-passport-nice' || pId.includes('passport')) return BUSINESS_PROFILES.LE_PASSPORT_NICE;
  return BUSINESS_PROFILES.RESTAURANT;
}

export function getDishImageUrl(dish) {
  if (dish.media?.heroImage) return resolveAssetUrl(dish.media.heroImage);
  if (dish.heroImage_url) return resolveAssetUrl(dish.heroImage_url);
  if (dish.heroImage) return resolveAssetUrl(dish.heroImage);

  if (dish.businessProfile === 'le-passport-nice') {
    if (dish.category === 'galettes') return '/assets/images/le-passport-nice/galettes.png';
    if (dish.category === 'crepes') return '/assets/images/le-passport-nice/crepes.png';
    if (dish.category === 'petit_dejeuner') return '/assets/images/le-passport-nice/Viennoiserie.png';
    if (dish.category === 'plats_du_jour') return '/assets/images/le-passport-nice/entrecote.png';
    if (dish.category === 'cocktails') return '/assets/images/signature_cocktail.png';
    if (dish.category === 'bieres_cidre' || dish.category === 'boissons_froides') return '/assets/images/specialty_coffee.png';
  }
  return '';
}

// ==========================================
// 2. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initVideoObserver();
  setupEventListeners();
  renderApp();
  syncTenantBrandingFromApi();
});

async function syncTenantBrandingFromApi() {
  try {
    const slug = state.profileId === 'bakery_cafe' ? 'maison-cafe' : 'gourmet-bistro';
    const data = await apiRequest(`/public/menus/${slug}`, { auth: false, cache: 'no-store' });
    if (!data?.tenant) return;

    const current = db.getThemeConfig(state.profileId);
    const updated = {
      ...current,
      name: data.tenant.name || current.name,
      tagline: data.tenant.tagline !== undefined ? data.tenant.tagline : current.tagline,
      logoUrl: data.tenant.logoUrl !== undefined ? data.tenant.logoUrl : current.logoUrl,
      accentColor: data.tenant.accentColor || current.accentColor,
      currencySymbol: data.tenant.currencySymbol || current.currencySymbol
    };
    try {
      const storageData = JSON.parse(localStorage.getItem('aura_menu_themes_v6') || '{}');
      storageData[state.profileId] = updated;
      localStorage.setItem('aura_menu_themes_v6', JSON.stringify(storageData));
    } catch {
      // Ignorar si localStorage está lleno; igual renderizamos con los datos en memoria
    }
    window.__syncedThemeConfig = updated;
    renderApp();
  } catch {
    // Fallback offline silencioso
  }
}

/**
 * Inicializa IntersectionObserver para reproducción diferida de micro-videos (60 FPS)
 */
function initVideoObserver() {
  state.videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => { });
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
  setupSheetSwipeToClose();

  // Horizontal Drag + Wheel Scroll para filtros, categorías y carrusel
  enableHorizontalScroll('.dietary-chips-scroll');
  enableHorizontalScroll('.category-nav-wrapper');
  enableHorizontalScroll('.featured-carousel-scroll');
}

function enableHorizontalScroll(selector) {
  document.querySelectorAll(selector).forEach(el => {
    // Rueda del mouse vertical -> desplazamiento horizontal
    el.addEventListener('wheel', (e) => {
      if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    // Arrastrar con el mouse (click & drag) sin bloquear clics normales
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasDragged = false;

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      isDown = false;
    });

    el.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const x = e.pageX - el.offsetLeft;
      const walk = x - startX;
      if (Math.abs(walk) > 5) {
        hasDragged = true;
        e.preventDefault();
        el.scrollLeft = scrollLeft - walk;
      }
    });

    el.addEventListener('click', (e) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        hasDragged = false;
      }
    }, true);
  });
}

function getContrastColor(hexColor) {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // If luminance > 0.45, text on this background must be dark (#0f172a) for high contrast WCAG AA/AAA
  return luminance > 0.45 ? '#0f172a' : '#ffffff';
}

// ==========================================
// 3. RENDERIZADO DE INTERFAZ
// ==========================================
function renderApp() {
  const defaultProfile = getProfileDef(state.profileId);
  const themeConfig = window.__syncedThemeConfig || db.getThemeConfig(state.profileId);

  // Apply theme mode (dark / light)
  const defaultThemeMode = defaultProfile.themeMode || (state.profileId === 'restaurant' ? 'dark' : 'light');
  const themeMode = themeConfig.themeMode || defaultThemeMode;
  document.documentElement.setAttribute('data-theme-mode', themeMode);
  document.body.setAttribute('data-theme-mode', themeMode);

  // Apply custom accent color with high-contrast calculations
  let accent = themeConfig.accentColor;
  if (!accent || accent.toLowerCase() === '#ffffff') {
    accent = state.profileId === 'restaurant' ? '#207567' : '#7c4a27';
  }
  document.documentElement.style.setProperty('--accent-gold', accent);

  let hex = accent.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  let r = 32, g = 117, b = 103;
  if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16) || 0;
    g = parseInt(hex.substring(2, 4), 16) || 0;
    b = parseInt(hex.substring(4, 6), 16) || 0;
  }
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const contrastText = lum > 0.45 ? '#0f172a' : '#ffffff';

  document.documentElement.style.setProperty('--accent-text-color', contrastText);
  document.documentElement.style.setProperty('--accent-gold-light', `rgba(${r}, ${g}, ${b}, 0.18)`);
  document.documentElement.style.setProperty('--accent-gold-border', `rgba(${r}, ${g}, ${b}, 0.38)`);

  // Accent text display for prices and icons on dark vs light backgrounds
  if (themeMode === 'dark') {
    if (lum < 0.38) {
      // If the accent is too dark to read on a dark background, provide a luminous tone
      const bR = Math.min(255, Math.round(r * 1.8 + 65));
      const bG = Math.min(255, Math.round(g * 1.8 + 65));
      const bB = Math.min(255, Math.round(b * 1.8 + 65));
      document.documentElement.style.setProperty('--accent-text-display', `rgb(${bR}, ${bG}, ${bB})`);
    } else {
      document.documentElement.style.setProperty('--accent-text-display', accent);
    }
  } else {
    if (lum > 0.65) {
      // If the accent is too light to read on a white background, provide a darkened tone
      const dR = Math.round(r * 0.65);
      const dG = Math.round(g * 0.65);
      const dB = Math.round(b * 0.65);
      document.documentElement.style.setProperty('--accent-text-display', `rgb(${dR}, ${dG}, ${dB})`);
    } else {
      document.documentElement.style.setProperty('--accent-text-display', accent);
    }
  }

  // Check Menu Active Status
  const isMenuActive = themeConfig.menuIsActive !== false;
  let offlineBanner = document.getElementById('menuOfflineBanner');
  const mainHeader = document.querySelector('.brand-header');

  if (!isMenuActive) {
    if (!offlineBanner && mainHeader) {
      offlineBanner = document.createElement('div');
      offlineBanner.id = 'menuOfflineBanner';
      offlineBanner.className = 'menu-offline-banner';
      offlineBanner.innerHTML = '<i data-lucide="eye-off" style="width:18px;height:18px;"></i> Menú pausado por el establecimiento (Modo Fuera de Línea)';
      mainHeader.after(offlineBanner);
    }
  } else if (offlineBanner) {
    offlineBanner.remove();
  }

  // 1. Render Header Brand Info
  const brandName = themeConfig.name || defaultProfile.name;
  const brandTagline = themeConfig.tagline || defaultProfile.tagline;
  const logoUrl = (themeConfig.logoUrl || defaultProfile.logoUrl || '').trim();

  const logoEl = document.getElementById('brandLogoIcon');
  const titleEl = document.getElementById('brandTitle');
  const taglineEl = document.getElementById('brandTagline');

  if (logoEl) {
    if (logoUrl) {
      logoEl.classList.add('has-custom-logo');
      logoEl.innerHTML = `<img src="${logoUrl}" alt="${brandName}" class="brand-logo-png">`;
    } else {
      logoEl.classList.remove('has-custom-logo');
      logoEl.textContent = brandName.charAt(0);
    }
  }
  if (titleEl) titleEl.textContent = brandName;
  if (taglineEl) taglineEl.textContent = brandTagline;

  // 2. Render Promo Banner
  renderPromoBanner();

  // 3. Render "Los Más Elegidos" Horizontal Carousel
  renderFeaturedCarousel();

  // 4. Render Categories Navigation dynamically from DB
  const categories = db.getCategories(state.profileId);
  renderCategoriesNav(categories);

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
            <img src="${resolveAssetUrl(b.image) || '/assets/images/specialty_coffee.png'}" alt="${b.title || 'Banner Promocional'}" class="promo-slide-img" style="width: 100%; height: 100%; object-fit: cover;">
            ${(b.showTextOverlay && (b.title || b.badge)) ? `
              <div class="promo-slide-overlay">
                ${b.badge ? `<span class="promo-slide-badge">${b.badge}</span>` : ''}
                ${b.title ? `<h3 class="promo-slide-title">${b.title}</h3>` : ''}
                ${b.subtitle ? `<p class="promo-slide-subtitle">${b.subtitle}</p>` : ''}
              </div>
            ` : ''}
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
  const num = Number(amount);
  
  if (currSymbol === '€') {
    const formatted = num.toLocaleString('fr-FR', {
      minimumFractionDigits: num % 1 !== 0 ? 2 : 2,
      maximumFractionDigits: 2
    });
    return `${formatted} €`;
  }
  
  const formatted = num % 1 !== 0 ? num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : num.toLocaleString('es-AR');
  return `${currSymbol} ${formatted}`;
}

/**
 * Helpers para detección de fotos/videos en platos
 */
function dishHasMedia(dish) {
  if (!dish) return false;
  const hasVideo = Boolean(dish.media?.videoLoopUrl && dish.media.videoLoopUrl.trim());
  const hero = (dish.media?.heroImage || dish.hero_image_url || dish.heroImage || dish.heroImage_url || '').trim();
  if (hasVideo || hero) return true;
  if (dish.businessProfile === 'le-passport-nice') {
    return Boolean(getDishImageUrl(dish));
  }
  return false;
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

  const themeConfig = db.getThemeConfig(state.profileId);
  const showPrepTime = themeConfig ? (themeConfig.showPrepTime !== false) : true;

  featuredItems.forEach(item => {
    const card = document.createElement('div');
    const hasMedia = dishHasMedia(item);
    card.className = `featured-card ${hasMedia ? '' : 'featured-card-no-media'}`.trim();

    const formattedPrice = formatPrice(item.price, currSymbol);

    const hasPrepTime = Boolean(item.prepTime && item.prepTime.trim());
    const timeBadgeHTML = (showPrepTime && hasPrepTime) ? `
      <div class="card-meta-badges">
        <div class="time-badge">
          <i data-lucide="clock" style="width:11px;height:11px;"></i> ${item.prepTime.trim()}
        </div>
      </div>` : '';

    const mediaHTML = hasMedia ? `
      <div class="featured-card-media">
        <img src="${getDishImageUrl(item)}" alt="${item.name}" loading="lazy">
        ${timeBadgeHTML}
      </div>` : '';

    const inlineTimeBadge = (!hasMedia && showPrepTime && hasPrepTime) ? `
      <div class="time-badge" style="margin-bottom:6px;width:fit-content;">
        <i data-lucide="clock" style="width:11px;height:11px;"></i> ${item.prepTime.trim()}
      </div>` : '';

    card.innerHTML = `
      ${mediaHTML}
      <div class="featured-card-body">
        ${inlineTimeBadge}
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

  const getCategoryIcon = (catId, providedIcon) => {
    if (providedIcon) return providedIcon;
    switch (catId) {
      case 'all': return 'sparkles';
      case 'principales': return 'utensils';
      case 'entradas': return 'salad';
      case 'postres': return 'cake-slice';
      case 'pasteleria': return 'cake';
      case 'cafe_especialidad': return 'coffee';
      case 'brunch': return 'sandwich';
      case 'bebidas_frias': return 'cup-soda';
      case 'cocteleria': return 'wine';
      default: return 'tag';
    }
  };

  const allProfileItems = db.getItemsByProfile(state.profileId);
  const visibleCategories = categories.filter(cat => {
    if (cat.id === 'all') return true;
    return allProfileItems.some(d => d.category === cat.id);
  });

  visibleCategories.forEach(cat => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cat-pill ${state.activeCategory === cat.id ? 'active' : ''}`;
    button.dataset.catId = cat.id;

    const iconName = getCategoryIcon(cat.id, cat.icon);

    button.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${cat.name}</span>
    `;

    button.addEventListener('click', () => {
      state.isProgrammaticScroll = true;
      clearTimeout(state.scrollLockTimer);
      state.scrollLockTimer = setTimeout(() => {
        state.isProgrammaticScroll = false;
      }, 750);

      state.activeCategory = cat.id;
      document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      button.classList.add('active');

      const navWrapper = document.querySelector('.category-nav-wrapper');
      if (navWrapper) {
        const targetLeft = button.offsetLeft - (navWrapper.clientWidth / 2) + (button.clientWidth / 2);
        navWrapper.scrollLeft = Math.max(0, targetLeft);
      }

      if (cat.id === 'all') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const targetSection = document.getElementById(`cat-section-${cat.id}`);
      if (targetSection) {
        const headerEl = document.querySelector('.app-header');
        const headerOffset = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) + 12 : 165;
        targetSection.style.scrollMarginTop = `${headerOffset}px`;
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    navContainer.appendChild(button);
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Renderiza todo el menú agrupado por secciones de categoría (scroll continuo)
 */
function renderDishesList() {
  const container = document.getElementById('dishesContainer');
  if (!container) return;

  const topTitleEl = document.getElementById('currentCategoryTitle');
  if (topTitleEl && topTitleEl.parentElement) {
    topTitleEl.parentElement.style.display = 'none';
  }

  container.innerHTML = '';
  container.className = 'menu-sections-wrapper';

  const allProfileItems = db.getItemsByProfile(state.profileId);

  // Filtrado por banderas dietéticas (mantiene todas las categorías visibles)
  const filteredDishes = allProfileItems.filter(dish => {
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
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i data-lucide="utensils" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
        <h3 style="font-size: 1.1rem; margin-bottom: 4px;">No se encontraron opciones</h3>
        <p style="font-size: 0.85rem;">Prueba desactivar los filtros dietéticos para ver toda la carta.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const categories = db.getCategories(state.profileId).filter(c => c.id !== 'all');
  const assignedIds = new Set();
  const gridClass = state.currentViewMode === 'visual' ? 'visual-grid' : 'compact-list';

  const appendCategorySection = (catId, catName, dishes) => {
    if (!dishes || dishes.length === 0) return;

    const section = document.createElement('section');
    section.className = 'menu-category-section';
    section.id = `cat-section-${catId}`;
    section.dataset.catId = catId;

    const header = document.createElement('div');
    header.className = 'menu-section-header';
    header.innerHTML = `
      <h2 class="menu-section-title">${catName}</h2>
      <span class="menu-section-count">${dishes.length}</span>
    `;

    const listEl = document.createElement('div');
    listEl.className = gridClass;

    dishes.forEach(dish => {
      assignedIds.add(dish.id);
      if (state.currentViewMode === 'visual') {
        listEl.appendChild(createVisualCard(dish));
      } else {
        listEl.appendChild(createCompactCard(dish));
      }
    });

    section.appendChild(header);
    section.appendChild(listEl);
    container.appendChild(section);
  };

  categories.forEach(cat => {
    const catDishes = filteredDishes.filter(d => d.category === cat.id);
    appendCategorySection(cat.id, cat.name, catDishes);
  });

  const uncategorized = filteredDishes.filter(d => !assignedIds.has(d.id));
  if (uncategorized.length > 0) {
    appendCategorySection('otros', 'Otras Opciones', uncategorized);
  }

  // Observar videos para reproducción eficiente
  document.querySelectorAll('video[data-lazy-video]').forEach(v => {
    state.videoObserver.observe(v);
  });

  setupCategoryScrollSpy();

  if (window.lucide) window.lucide.createIcons();
}

let scrollSpyAttached = false;
function setupCategoryScrollSpy() {
  if (scrollSpyAttached) return;
  scrollSpyAttached = true;

  let ticking = false;
  const onScroll = () => {
    if (state.isProgrammaticScroll) return;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (state.isProgrammaticScroll) return;
      const sections = document.querySelectorAll('.menu-category-section');
      if (sections.length === 0) return;

      const headerEl = document.querySelector('.app-header');
      const offset = (headerEl ? headerEl.getBoundingClientRect().height : 130) + 40;
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      const winHeight = window.innerHeight || document.documentElement.clientHeight;
      const atBottom = (scrollY + winHeight) >= (docHeight - 16);

      if (scrollY < 60) {
        setActiveCategoryPill('all');
        return;
      }

      if (atBottom) {
        setActiveCategoryPill(sections[sections.length - 1].dataset.catId);
        return;
      }

      let currentCatId = sections[0].dataset.catId;
      sections.forEach(sec => {
        if (sec.getBoundingClientRect().top <= offset) {
          currentCatId = sec.dataset.catId;
        }
      });

      if (currentCatId) setActiveCategoryPill(currentCatId);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  document.body.addEventListener('scroll', onScroll, { passive: true });
}

function setActiveCategoryPill(catId) {
  if (state.activeCategory === catId) return;
  state.activeCategory = catId;
  const navWrapper = document.querySelector('.category-nav-wrapper');
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(p => {
    const isMatch = p.dataset.catId === catId;
    p.classList.toggle('active', isMatch);
    if (isMatch && navWrapper) {
      const targetLeft = p.offsetLeft - (navWrapper.clientWidth / 2) + (p.clientWidth / 2);
      navWrapper.scrollLeft = Math.max(0, targetLeft);
    }
  });
}

/**
 * Crea la tarjeta en Modo Experiencia Visual (SIN botón de añadir)
 * Soporta platos CON foto y platos SIN foto (omitiendo el espacio de imagen)
 */
function createVisualCard(dish) {
  const card = document.createElement('article');
  const hasMedia = dishHasMedia(dish);
  card.className = `dish-card-visual ${hasMedia ? '' : 'dish-card-no-media'}`.trim();

  const currSymbol = getGlobalCurrencySymbol();
  const comboInfo = db.resolveCombo(dish);
  const effectiveAvailable = dish.isAvailable && (!comboInfo || comboInfo.allComponentsAvailable);

  const hasMultipleSizes = dish.hasVariations && Array.isArray(dish.variations) && dish.variations.length > 1;
  const lowestPrice = hasMultipleSizes
    ? Math.min(...dish.variations.map(v => Number(v.price) || 0))
    : (Number(dish.price) || 0);

  const formattedPrice = hasMultipleSizes
    ? `<span class="card-price-prefix">Desde</span> ${formatPrice(lowestPrice, currSymbol)}`
    : formatPrice(dish.price, currSymbol);

  const comboPriceCompareHTML = (comboInfo && comboInfo.savingsAmount > 0)
    ? `<span class="combo-regular-price">${formatPrice(comboInfo.regularTotal, currSymbol)}</span>`
    : '';

  const hasVideo = !!dish.media?.videoLoopUrl;
  const hasAR = !!dish.media?.model3dUrl;

  const isFrench = state.profileId === 'le-passport-nice' || document.documentElement.lang === 'fr';
  const comboBadgeHTML = comboInfo
    ? `<span class="badge badge-combo"><i data-lucide="package" style="width:11px;height:11px;"></i> COMBO${comboInfo.savingsPercent > 0 ? ` · -${comboInfo.savingsPercent}%` : ''}</span>`
    : '';

  const sizeBadgeHTML = hasMultipleSizes
    ? `<span class="badge badge-size-options"><i data-lucide="layers"></i> ${dish.variations.length} tamaños</span>`
    : '';

  const dietaryTags = [];
  if (dish.dietaryFlags?.isGlutenFree) dietaryTags.push(isFrench ? 'Sans gluten' : 'Sin TACC');
  if (dish.dietaryFlags?.isVegan) dietaryTags.push(isFrench ? 'Végan' : 'Vegano');
  if (dish.dietaryFlags?.isVegetarian) dietaryTags.push(isFrench ? 'Végétarien' : 'Vegetariano');
  if (dish.dietaryFlags && !dish.dietaryFlags.containsDairy) dietaryTags.push(isFrench ? 'Sans lactose' : 'Sin Lactosa');

  const tagsHTML = dietaryTags.map(t => `<span class="tag-diet">${t}</span>`).join('');

  const unavailableSubtext = (comboInfo && !comboInfo.allComponentsAvailable)
    ? `Falta stock de: ${comboInfo.unavailableNames.join(', ')}`
    : 'Consulte con su mozo disponibilidad próxima';

  const unavailableOverlay = !effectiveAvailable ? `
    <div class="card-unavailable-overlay">
      <span>${isFrench ? 'Épuisé temporairement' : 'Agotado Temporalmente'}</span>
      <p style="font-size: 0.75rem; margin-top: 6px;">${isFrench ? 'Consultez votre serveur' : unavailableSubtext}</p>
    </div>
  ` : '';

  const comboIncludesHTML = comboInfo ? `
    <div class="combo-includes-box">
      <div class="combo-includes-label"><i data-lucide="check-circle-2" style="width:13px;height:13px;"></i> Incluye:</div>
      <ul class="combo-includes-list">
        ${comboInfo.items.map(ci => `
          <li class="${ci.isAvailable ? '' : 'combo-item-missing'}">
            <strong>${ci.qty}×</strong> ${ci.name}
          </li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  const themeConfig = db.getThemeConfig(state.profileId);
  const showPrepTime = themeConfig ? (themeConfig.showPrepTime !== false) : true;

  const hasPrepTime = Boolean(dish.prepTime && dish.prepTime.trim());
  const timeBadgeHTML = (showPrepTime && hasPrepTime) ? `
    <div class="time-badge">
      <i data-lucide="clock" style="width:11px;height:11px;"></i> ${dish.prepTime.trim()}
    </div>
  ` : '';

  let variationsHTML = '';
  if (hasMultipleSizes) {
    variationsHTML = `
      <div class="card-sizes-pills-row" title="Porciones disponibles en la carta">
        ${dish.variations.map(v => `
          <div class="portion-badge-chip">
            <span class="portion-badge-name">${v.name}</span>
            <span class="portion-badge-price">${formatPrice(v.price, currSymbol)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (hasMedia) {
    // Caso con Foto o Video: se muestra media box con su tamaño estético habitual
    const mediaHTML = hasVideo ? `
      <video data-lazy-video src="${dish.media.videoLoopUrl}" poster="${getDishImageUrl(dish)}" loop muted playsinline aria-label="${dish.name} video"></video>
      <div class="badge-video" title="Micro-video de cocción"><i data-lucide="play" style="width:12px;height:12px;"></i></div>
    ` : `
      <img src="${getDishImageUrl(dish)}" alt="${dish.name}" loading="lazy">
    `;

    const badgesHTML = `
      <div class="badge-container">
        ${comboBadgeHTML}
        ${dish.isChefSpecial ? `<span class="badge badge-chef">Sugerencia Chef</span>` : ''}
        ${sizeBadgeHTML}
        ${hasAR ? `<span class="badge badge-ar"><i data-lucide="box" style="width:12px;height:12px;"></i> 3D AR</span>` : ''}
      </div>
    `;

    card.innerHTML = `
      ${unavailableOverlay}
      <div class="card-media-box">
        ${badgesHTML}
        ${mediaHTML}
        ${timeBadgeHTML ? `<div class="card-meta-badges">${timeBadgeHTML}</div>` : ''}
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <h3>${dish.name}</h3>
          <div class="card-price-stack">
            ${comboPriceCompareHTML}
            <span class="card-price">${formattedPrice}</span>
          </div>
        </div>
        <p class="card-description">${dish.shortDescription || ''}</p>
        ${comboIncludesHTML}
        ${variationsHTML}
        <div class="dietary-tags-row">
          ${tagsHTML}
        </div>
        <div class="card-footer-actions">
          <button type="button" class="btn-open-detail">
            <i data-lucide="eye" style="width:16px;height:16px;"></i> ${comboInfo ? 'Ver Detalle del Combo' : (isFrench ? 'Détails & Ingrédients' : 'Ver Plato y Detalles')}
          </button>
        </div>
      </div>
    `;

    card.querySelector('.card-media-box')?.addEventListener('click', () => {
      openDishModal(dish);
    });
  } else {
    // Caso SIN Foto: Omitimos completamente el contenedor de imagen
    const topBadges = [];
    if (comboBadgeHTML) topBadges.push(comboBadgeHTML);
    if (dish.isChefSpecial) topBadges.push(`<span class="badge badge-chef">Sugerencia Chef</span>`);
    if (sizeBadgeHTML) topBadges.push(sizeBadgeHTML);
    if (hasAR) topBadges.push(`<span class="badge badge-ar"><i data-lucide="box" style="width:12px;height:12px;"></i> 3D AR</span>`);
    if (timeBadgeHTML) topBadges.push(timeBadgeHTML);

    const topBadgesHTML = topBadges.length > 0 ? `
      <div class="card-top-badges-inline">
        ${topBadges.join('')}
      </div>
    ` : '';

    card.innerHTML = `
      ${unavailableOverlay}
      <div class="card-body">
        ${topBadgesHTML}
        <div class="card-title-row">
          <h3>${dish.name}</h3>
          <div class="card-price-stack">
            ${comboPriceCompareHTML}
            <span class="card-price">${formattedPrice}</span>
          </div>
        </div>
        <p class="card-description">${dish.shortDescription || ''}</p>
        ${comboIncludesHTML}
        ${variationsHTML}
        <div class="dietary-tags-row">
          ${tagsHTML}
        </div>
        <div class="card-footer-actions">
          <button type="button" class="btn-open-detail">
            <i data-lucide="eye" style="width:16px;height:16px;"></i> ${comboInfo ? 'Ver Detalle del Combo' : 'Ver Plato y Detalles'}
          </button>
        </div>
      </div>
    `;
  }

  // Listeners
  card.querySelector('.btn-open-detail')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openDishModal(dish);
  });

  card.addEventListener('click', () => {
    openDishModal(dish);
  });

  return card;
}

/**
 * Crea la tarjeta en Modo Lista Compacta (SIN fotos ni botón de añadir, lectura rápida)
 */
function createCompactCard(dish) {
  const card = document.createElement('article');
  card.className = 'dish-card-compact';

  const isFrench = state.profileId === 'le-passport-nice' || document.documentElement.lang === 'fr';
  const currSymbol = getGlobalCurrencySymbol();
  const comboInfo = db.resolveCombo(dish);
  const effectiveAvailable = dish.isAvailable && (!comboInfo || comboInfo.allComponentsAvailable);

  const hasMultipleSizes = dish.hasVariations && Array.isArray(dish.variations) && dish.variations.length > 1;
  const lowestPrice = hasMultipleSizes
    ? Math.min(...dish.variations.map(v => Number(v.price) || 0))
    : (Number(dish.price) || 0);

  const formattedPrice = hasMultipleSizes
    ? `Desde ${formatPrice(lowestPrice, currSymbol)}`
    : formatPrice(dish.price, currSymbol);

  const comboSummary = comboInfo
    ? `<div class="compact-combo-items">${comboInfo.items.map(ci => `${ci.qty}× ${ci.name}`).join(' · ')}</div>`
    : '';

  const comboBadge = comboInfo
    ? `<span class="compact-combo-badge">COMBO${comboInfo.savingsPercent > 0 ? ` -${comboInfo.savingsPercent}%` : ''}</span>`
    : '';

  const regularPriceHTML = (comboInfo && comboInfo.savingsAmount > 0)
    ? `<span class="combo-regular-price">${formatPrice(comboInfo.regularTotal, currSymbol)}</span>`
    : '';

  card.innerHTML = `
    <div class="compact-info">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px;">
        <h4 style="margin:0;">${dish.name}</h4>
        ${comboBadge}
      </div>
      <p>${dish.shortDescription || ''}</p>
      ${comboSummary}
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
      ${regularPriceHTML}
      <span class="compact-price">${formattedPrice}</span>
      ${hasMultipleSizes ? `<span class="compact-size-tag"><i data-lucide="layers" style="width:10px;height:10px;"></i> ${dish.variations.length} tamaños</span>` : ''}
      ${!effectiveAvailable ? `<span style="font-size:0.7rem;color:var(--status-out-text);font-weight:700;">${isFrench ? 'Épuisé' : 'Agotado'}</span>` : ''}
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
  const hasMultipleSizes = dish.hasVariations && Array.isArray(dish.variations) && dish.variations.length > 0;

  document.getElementById('modalDishTitle').textContent = dish.name;

  const modalPriceEl = document.getElementById('modalDishPrice');
  if (modalPriceEl) {
    if (hasMultipleSizes) {
      const prices = dish.variations.map(v => Number(v.price) || 0);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      if (minP !== maxP) {
        modalPriceEl.textContent = `${formatPrice(minP, currSymbol)} – ${formatPrice(maxP, currSymbol)}`;
      } else {
        modalPriceEl.textContent = formatPrice(minP, currSymbol);
      }
    } else {
      modalPriceEl.textContent = formatPrice(dish.price, currSymbol);
    }
  }
  document.getElementById('modalDishStory').textContent = dish.fullStory || dish.shortDescription || '';

  // Render Informational Multi-size & Portion breakdown (Carta Informativa)
  const modalVariationsContainer = document.getElementById('modalVariationsContainer');
  if (modalVariationsContainer) {
    if (hasMultipleSizes) {
      modalVariationsContainer.style.display = 'block';
      modalVariationsContainer.innerHTML = `
        <div class="modal-portions-section">
          <div class="modal-portions-header">
            <div class="modal-portions-title-box">
              <i data-lucide="scale" style="width:16px;height:16px;color:var(--accent-text-display, var(--accent-gold));"></i>
              <span class="modal-portions-title">Opciones de Tamaño & Precio</span>
            </div>
          </div>
          
          <div class="portions-list-stack">
            ${dish.variations.map(v => `
              <div class="portion-info-card">
                <div class="portion-info-main">
                  <span class="portion-title">${v.name}</span>
                  ${(v.description || v.desc) ? `<span class="portion-desc">${v.description || v.desc}</span>` : ''}
                </div>
                <div class="portion-price-badge">
                  ${formatPrice(v.price, currSymbol)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      modalVariationsContainer.style.display = 'none';
      modalVariationsContainer.innerHTML = '';
    }
  }

  // Render Hero Media
  const sheet = document.getElementById('dishModalSheet');
  const mediaContainer = document.getElementById('modalHeroMediaContainer');
  const hasMedia = dishHasMedia(dish);

  if (hasMedia) {
    if (sheet) sheet.classList.remove('no-hero-media');
    if (mediaContainer) {
      mediaContainer.style.display = 'block';
      mediaContainer.innerHTML = '';
      if (dish.media?.videoLoopUrl) {
        const video = document.createElement('video');
        video.src = dish.media.videoLoopUrl;
        video.poster = getDishImageUrl(dish);
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        mediaContainer.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = getDishImageUrl(dish);
        img.alt = dish.name;
        mediaContainer.appendChild(img);
      }
    }
  } else {
    if (sheet) sheet.classList.add('no-hero-media');
    if (mediaContainer) {
      mediaContainer.style.display = 'none';
      mediaContainer.innerHTML = '';
    }
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

  // Render Interactive Ingredients / Layers OR Combo Components
  const layersContainer = document.getElementById('modalLayersList');
  const layersSectionTitle = layersContainer?.previousElementSibling;
  layersContainer.innerHTML = '';

  const comboInfo = db.resolveCombo(dish);

  if (comboInfo) {
    if (layersSectionTitle) layersSectionTitle.textContent = 'Productos Incluidos en el Combo';
    const savingsBanner = comboInfo.savingsAmount > 0 ? `
      <div class="modal-combo-savings-card">
        <div>
          <span class="modal-combo-savings-label">Por separado: <s>${formatPrice(comboInfo.regularTotal, currSymbol)}</s></span>
          <strong class="modal-combo-savings-highlight">Ahorrás ${formatPrice(comboInfo.savingsAmount, currSymbol)} (${comboInfo.savingsPercent}% OFF)</strong>
        </div>
        <span class="badge badge-combo">COMBO</span>
      </div>
    ` : '';

    layersContainer.innerHTML = `
      ${savingsBanner}
      <div class="modal-combo-items-list">
        ${comboInfo.items.map(ci => `
          <div class="modal-combo-item-row ${ci.isAvailable ? '' : 'is-out'}">
            <div class="modal-combo-item-left">
              <span class="modal-combo-qty">${ci.qty}×</span>
              <div>
                <div class="modal-combo-name">${ci.name}</div>
                <div class="modal-combo-unit">Valor individual: ${formatPrice(ci.unitPrice, currSymbol)} c/u</div>
              </div>
            </div>
            <span class="modal-combo-status ${ci.isAvailable ? 'ok' : 'out'}">
              ${ci.isAvailable ? 'Disponible' : 'Sin stock'}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    if (layersSectionTitle) layersSectionTitle.textContent = 'Desglose de Capas e Ingredientes';
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
  if (backdrop) {
    backdrop.style.opacity = '';
    backdrop.classList.remove('open');
  }
  if (sheet) {
    sheet.style.transition = '';
    sheet.style.transform = '';
    sheet.classList.remove('open');
  }
}

/**
 * Permite cerrar la tarjeta de detalle deslizando hacia abajo (táctil y mouse)
 */
function setupSheetSwipeToClose() {
  const sheet = document.getElementById('dishModalSheet');
  const backdrop = document.getElementById('dishModalBackdrop');
  if (!sheet) return;

  let startY = 0;
  let currentDeltaY = 0;
  let isDragging = false;

  const startDrag = (clientY) => {
    if (!sheet.classList.contains('open')) return;
    if (sheet.scrollTop > 0) return;
    startY = clientY;
    currentDeltaY = 0;
    isDragging = true;
    sheet.style.transition = 'none';
  };

  const moveDrag = (clientY, event) => {
    if (!isDragging) return;
    const deltaY = clientY - startY;
    if (deltaY > 0 && sheet.scrollTop <= 0) {
      currentDeltaY = deltaY;
      if (event && event.cancelable) event.preventDefault();
      sheet.style.transform = `translateX(-50%) translateY(${deltaY}px)`;
      if (backdrop) {
        backdrop.style.opacity = String(Math.max(0, 1 - (deltaY / 320)));
      }
    } else if (deltaY < 0) {
      currentDeltaY = 0;
      sheet.style.transform = 'translateX(-50%) translateY(0px)';
    }
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = '';

    if (currentDeltaY > 85) {
      closeDishModal();
    } else {
      sheet.style.transform = '';
      if (backdrop) backdrop.style.opacity = '';
    }
    currentDeltaY = 0;
  };

  // Soporte Táctil (Celular)
  sheet.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) startDrag(e.touches[0].clientY);
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) moveDrag(e.touches[0].clientY, e);
  }, { passive: false });

  sheet.addEventListener('touchend', endDrag);
  sheet.addEventListener('touchcancel', endDrag);

  // Soporte Mouse (PC / Preview Admin)
  sheet.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, a, input, select')) return;
    startDrag(e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) moveDrag(e.clientY, e);
  });

  window.addEventListener('mouseup', endDrag);
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
