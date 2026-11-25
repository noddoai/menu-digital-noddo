/**
 * Módulo de Pestaña: Disponibles & Stock rápido
 * HTML asociado: /admin/tabs/stock/stock-tab.html
 */

import { BUSINESS_PROFILES } from '../../../shared/menuData.js';
import { db } from '../../../shared/db.js';
import { resolveAssetUrl } from '../../../shared/utils/asset-url.js';

let stockContext = {
  getProfileId: () => 'restaurant',
  getCurrencySymbol: () => '$',
  showToast: () => {},
  onStockToggled: () => {}
};

function getProfileDefinition(profileId) {
  if (profileId === 'le-passport-nice') return BUSINESS_PROFILES.LE_PASSPORT_NICE;
  if (profileId === 'bakery_cafe') return BUSINESS_PROFILES.BAKERY_CAFE;
  return BUSINESS_PROFILES.RESTAURANT;
}

export function renderStockTab(query = '') {
  const grid = document.getElementById('quickStockGrid');
  if (!grid) return;

  const profileId = stockContext.getProfileId();
  const profile = getProfileDefinition(profileId);
  let items = db.getItemsByProfile(profileId);

  if (query) {
    items = items.filter(
      (i) => i.name.toLowerCase().includes(query) || (i.shortDescription || '').toLowerCase().includes(query)
    );
  }

  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; color: #64748b; text-align: center; padding: 24px;">No hay productos coincidentes con la búsqueda.</div>';
    return;
  }

  const categoriesMap = new Map();
  profile.categories.filter((c) => c.id !== 'all').forEach((cat) => {
    categoriesMap.set(cat.id, { name: cat.name, icon: cat.icon || 'tag', items: [] });
  });
  categoriesMap.set('otros', { name: 'Otros / Sin Categoría', icon: 'grid', items: [] });

  items.forEach((item) => {
    const catKey = item.category && categoriesMap.has(item.category) ? item.category : 'otros';
    categoriesMap.get(catKey).items.push(item);
  });

  const currSymbol = stockContext.getCurrencySymbol() || '$';

  categoriesMap.forEach((catData) => {
    if (catData.items.length === 0) return;

    const divider = document.createElement('div');
    divider.className = 'category-divider-row';
    divider.innerHTML = `
      <span class="category-divider-title">
        <i data-lucide="${catData.icon}"></i> ${catData.name}
      </span>
      <div class="category-divider-line"></div>
    `;
    grid.appendChild(divider);

    catData.items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'quick-stock-card';

      const imgUrl = resolveAssetUrl(item.media?.heroImage || item.heroImage_url || item.heroImage || '');
      const thumbHTML = imgUrl
        ? `<img src="${imgUrl}" alt="${item.name}">`
        : '<div style="width:50px;height:50px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;flex-shrink:0;border:1px dashed #cbd5e1;" title="Sin foto"><i data-lucide="image-off" style="width:16px;height:16px;"></i></div>';

      card.innerHTML = `
        ${thumbHTML}
        <div class="quick-stock-info">
          <div class="quick-stock-name">${item.name}</div>
          <div class="quick-stock-price">${currSymbol} ${item.price.toLocaleString('es-AR')}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <label class="toggle-switch" title="Activar/Pausar stock">
            <input type="checkbox" class="btn-quick-stock-toggle" data-id="${item.id}" ${item.isAvailable ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <span class="status-badge-pill ${item.isAvailable ? 'status-active' : 'status-paused'}" style="font-size: 0.7rem;">
            ${item.isAvailable ? 'En Stock' : 'Agotado'}
          </span>
        </div>
      `;

      card.querySelector('.btn-quick-stock-toggle').addEventListener('change', () => {
        const newStatus = db.toggleAvailability(item.id);
        stockContext.showToast(newStatus ? `Producto "${item.name}" activado` : `Producto "${item.name}" pausado`);
        renderStockTab(query);
        stockContext.onStockToggled();
      });

      grid.appendChild(card);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

export function initStockTab(context = {}) {
  stockContext = { ...stockContext, ...context };

  const searchInput = document.getElementById('quickStockSearch');
  searchInput?.addEventListener('input', (e) => {
    renderStockTab(e.target.value.toLowerCase().trim());
  });
}
