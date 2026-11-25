/**
 * AURA & MAISON - MENÚ DIGITAL CLIENTE (Orquestador)
 * Coordina tema dinámico por API, filtros, secciones y componentes UI de app/menu/components/.
 */

import { BUSINESS_PROFILES } from '../shared/menuData.js';
import { db } from '../shared/db.js';
import { apiRequest } from '../shared/services/api-client.js';
import { renderPromoBanner } from './components/promo-banner.js';
import { renderFeaturedCarousel } from './components/featured-carousel.js';
import { renderCategoriesNav, setupCategoryScrollSpy } from './components/categories-nav.js';
import { createVisualCard, createCompactCard } from './components/dish-card.js';
import { openDishModal, closeDishModal, setupSheetSwipeToClose } from './components/dish-detail-sheet.js';

const urlParams = new URLSearchParams(window.location.search);
const profileFromUrl = urlParams.get('tenant') || urlParams.get('profile');
const profileId = profileFromUrl || document.documentElement.dataset.profile || 'restaurant';

const state = {
  profileId,
  activeCategory: 'all',
  activeDietaryFilters: new Set(),
  searchQuery: '',
  currentViewMode: 'visual',
  videoObserver: null,
  isProgrammaticScroll: false,
  scrollLockTimer: null
};

function getProfileDef(pId) {
  if (!pId) return BUSINESS_PROFILES.RESTAURANT;
  if (pId === 'bakery_cafe' || pId.includes('cafe')) return BUSINESS_PROFILES.BAKERY_CAFE;
  if (pId === 'le-passport-nice' || pId.includes('passport')) return BUSINESS_PROFILES.LE_PASSPORT_NICE;
  return BUSINESS_PROFILES.RESTAURANT;
}

function getGlobalCurrencySymbol() {
  const themeConfig = window.__syncedThemeConfig || db.getThemeConfig(state.profileId);
  return themeConfig?.currencySymbol || '$';
}

function handleSelectDish(dish) {
  openDishModal(dish, { currencySymbol: getGlobalCurrencySymbol() });
}

document.addEventListener('DOMContentLoaded', () => {
  initVideoObserver();
  setupEventListeners();
  renderApp();
  syncTenantBrandingFromApi();
});

async function syncTenantBrandingFromApi() {
  try {
    const slug =
      state.profileId === 'bakery_cafe'
        ? 'maison-cafe'
        : state.profileId === 'le-passport-nice'
          ? 'le-passport-nice'
          : 'gourmet-bistro';
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

function initVideoObserver() {
  state.videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.25 }
  );
}

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderDishesList();
  });

  document.querySelectorAll('.chip-filter').forEach((chip) => {
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

  document.getElementById('btnCloseDishModal')?.addEventListener('click', closeDishModal);
  document.getElementById('dishModalBackdrop')?.addEventListener('click', closeDishModal);
  setupSheetSwipeToClose();

  enableHorizontalScroll('.dietary-chips-scroll');
  enableHorizontalScroll('.category-nav-wrapper');
  enableHorizontalScroll('.featured-carousel-scroll');
}

function enableHorizontalScroll(selector) {
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener(
      'wheel',
      (e) => {
        if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      },
      { passive: false }
    );

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

    el.addEventListener(
      'click',
      (e) => {
        if (hasDragged) {
          e.preventDefault();
          e.stopPropagation();
          hasDragged = false;
        }
      },
      true
    );
  });
}

function applyTenantThemeTokens(defaultProfile, themeConfig) {
  const defaultThemeMode = defaultProfile.themeMode || (state.profileId === 'restaurant' ? 'dark' : 'light');
  const themeMode = themeConfig.themeMode || defaultThemeMode;
  document.documentElement.setAttribute('data-theme-mode', themeMode);
  document.body.setAttribute('data-theme-mode', themeMode);

  let accent = themeConfig.accentColor;
  if (!accent || accent.toLowerCase() === '#ffffff') {
    accent = state.profileId === 'restaurant' ? '#207567' : '#7c4a27';
  }
  document.documentElement.style.setProperty('--accent-gold', accent);

  let hex = accent.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  let r = 32;
  let g = 117;
  let b = 103;
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

  if (themeMode === 'dark' && lum < 0.38) {
    const bR = Math.min(255, Math.round(r * 1.8 + 65));
    const bG = Math.min(255, Math.round(g * 1.8 + 65));
    const bB = Math.min(255, Math.round(b * 1.8 + 65));
    document.documentElement.style.setProperty('--accent-text-display', `rgb(${bR}, ${bG}, ${bB})`);
  } else if (themeMode !== 'dark' && lum > 0.65) {
    const dR = Math.round(r * 0.65);
    const dG = Math.round(g * 0.65);
    const dB = Math.round(b * 0.65);
    document.documentElement.style.setProperty('--accent-text-display', `rgb(${dR}, ${dG}, ${dB})`);
  } else {
    document.documentElement.style.setProperty('--accent-text-display', accent);
  }
}

function renderApp() {
  const defaultProfile = getProfileDef(state.profileId);
  const themeConfig = window.__syncedThemeConfig || db.getThemeConfig(state.profileId);

  applyTenantThemeTokens(defaultProfile, themeConfig);

  const isMenuActive = themeConfig.menuIsActive !== false;
  let offlineBanner = document.getElementById('menuOfflineBanner');
  const mainHeader = document.querySelector('.brand-header');

  if (!isMenuActive) {
    if (!offlineBanner && mainHeader) {
      offlineBanner = document.createElement('div');
      offlineBanner.id = 'menuOfflineBanner';
      offlineBanner.className = 'menu-offline-banner';
      offlineBanner.innerHTML =
        '<i data-lucide="eye-off" style="width:18px;height:18px;"></i> Menú pausado por el establecimiento (Modo Fuera de Línea)';
      mainHeader.after(offlineBanner);
    }
  } else if (offlineBanner) {
    offlineBanner.remove();
  }

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

  renderPromoBanner({ profileId: state.profileId });
  renderFeaturedCarousel({
    profileId: state.profileId,
    currencySymbol: getGlobalCurrencySymbol(),
    onSelectDish: handleSelectDish
  });

  const categories = db.getCategories(state.profileId);
  renderCategoriesNav({
    profileId: state.profileId,
    categories,
    activeCategory: state.activeCategory,
    onCategorySelect: (catId) => {
      state.isProgrammaticScroll = true;
      clearTimeout(state.scrollLockTimer);
      state.scrollLockTimer = setTimeout(() => {
        state.isProgrammaticScroll = false;
      }, 750);
      state.activeCategory = catId;
    }
  });

  renderDishesList();
  if (window.lucide) window.lucide.createIcons();
}

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

  const filteredDishes = allProfileItems.filter((dish) => {
    if (state.searchQuery) {
      const matchName = (dish.name || '').toLowerCase().includes(state.searchQuery);
      const matchDesc = (dish.shortDescription || '').toLowerCase().includes(state.searchQuery);
      if (!matchName && !matchDesc) return false;
    }

    for (const filterKey of state.activeDietaryFilters) {
      const chipEl = document.querySelector(`.chip-filter[data-filter="${filterKey}"]`);
      const isInverted = chipEl && chipEl.dataset.invert === 'true';

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
        <p style="font-size: 0.85rem;">Prueba ajustar la búsqueda o los filtros dietéticos para ver toda la carta.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const categories = db.getCategories(state.profileId).filter((c) => c.id !== 'all');
  const assignedIds = new Set();
  const gridClass = state.currentViewMode === 'visual' ? 'visual-grid' : 'compact-list';
  const cardOptions = {
    profileId: state.profileId,
    currencySymbol: getGlobalCurrencySymbol(),
    onSelectDish: handleSelectDish
  };

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

    dishes.forEach((dish) => {
      assignedIds.add(dish.id);
      listEl.appendChild(
        state.currentViewMode === 'visual'
          ? createVisualCard(dish, cardOptions)
          : createCompactCard(dish, cardOptions)
      );
    });

    section.appendChild(header);
    section.appendChild(listEl);
    container.appendChild(section);
  };

  categories.forEach((cat) => {
    const catDishes = filteredDishes.filter((d) => d.category === cat.id);
    appendCategorySection(cat.id, cat.name, catDishes);
  });

  const uncategorized = filteredDishes.filter((d) => !assignedIds.has(d.id));
  if (uncategorized.length > 0) {
    appendCategorySection('otros', 'Otras Opciones', uncategorized);
  }

  document.querySelectorAll('video[data-lazy-video]').forEach((v) => {
    state.videoObserver.observe(v);
  });

  setupCategoryScrollSpy({
    isProgrammaticScroll: () => state.isProgrammaticScroll,
    getActiveCategory: () => state.activeCategory,
    onActiveCategoryChange: (nextCatId) => {
      state.activeCategory = nextCatId;
    }
  });

  if (window.lucide) window.lucide.createIcons();
}
