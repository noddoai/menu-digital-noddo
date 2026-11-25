/**
 * Módulo de Pestaña: Catálogo & Precios (Tabla, Filtros, Aumento Masivo y Editor de Platos/Combos)
 * HTML asociado: /admin/tabs/catalog/catalog-tab.html
 */

import { db } from '../../../shared/db.js';
import { resolveAssetUrl } from '../../../shared/utils/asset-url.js';
import { setupDropzone } from '../../components/image-dropzone.js';

const catalogState = {
  searchQuery: '',
  categoryFilter: 'all',
  stockFilter: 'all',
  editingDishId: null,
  editingComboItems: []
};

let catalogContext = {
  getProfileId: () => 'restaurant',
  getCurrencySymbol: () => '$',
  showToast: () => {},
  onCatalogUpdated: () => {}
};

export function populateCategoryFilter() {
  const select = document.getElementById('adminCategoryFilter');
  if (!select) return;

  const categories = db.getCategories(catalogContext.getProfileId());
  select.innerHTML = '<option value="all">Todas las Categorías</option>';
  categories
    .filter((c) => c.id !== 'all')
    .forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
}

function updateKpiMetrics() {
  const profileId = catalogContext.getProfileId();
  const allProfileItems = db.getItemsByProfile(profileId);
  const total = allProfileItems.length;
  const available = allProfileItems.filter((i) => i.isAvailable).length;
  const featured = allProfileItems.filter((i) => i.isFeatured).length;
  const slug =
    profileId === 'restaurant'
      ? 'gourmet-bistro'
      : profileId === 'le-passport-nice'
        ? 'le-passport-nice'
        : 'maison-cafe';

  const elTotal = document.getElementById('kpiTotalDishes');
  const elAvail = document.getElementById('kpiAvailableDishes');
  const elFeat = document.getElementById('kpiFeaturedDishes');
  const elSlug = document.getElementById('kpiSlugName');

  if (elTotal) elTotal.textContent = total;
  if (elAvail) elAvail.textContent = available;
  if (elFeat) elFeat.textContent = featured;
  if (elSlug) elSlug.textContent = slug;
}

export function renderCatalogTab() {
  updateKpiMetrics();
  const tbody = document.getElementById('adminItemsTableBody');
  if (!tbody) return;

  const profileId = catalogContext.getProfileId();
  let items = db.getItemsByProfile(profileId);

  items = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(catalogState.searchQuery) ||
      (item.shortDescription || '').toLowerCase().includes(catalogState.searchQuery);
    const matchesCategory = catalogState.categoryFilter === 'all' || item.category === catalogState.categoryFilter;
    const matchesStock =
      catalogState.stockFilter === 'all' ||
      (catalogState.stockFilter === 'available' ? item.isAvailable : !item.isAvailable);
    return matchesSearch && matchesCategory && matchesStock;
  });

  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center; padding: 24px; color: #9ca3af;">No se encontraron platos con los filtros seleccionados.</td></tr>';
    return;
  }

  const currSymbol = catalogContext.getCurrencySymbol() || '$';
  items.forEach((item) => {
    const tr = document.createElement('tr');
    const imgUrl = resolveAssetUrl(item.media?.heroImage || item.heroImage_url || item.heroImage || '');
    const thumbHTML = imgUrl
      ? `<img src="${imgUrl}" alt="${item.name}" class="table-dish-thumb">`
      : '<div class="table-dish-thumb" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#94a3b8;font-size:0.65rem;border:1px dashed #cbd5e1;" title="Sin foto"><i data-lucide="image-off" style="width:14px;height:14px;"></i></div>';

    tr.innerHTML = `
      <td>
        ${thumbHTML}
      </td>
      <td>
        <div class="table-dish-name">${item.name} ${item.isCombo ? '<span style="background:#d97706;color:#fff;font-size:0.65rem;font-weight:800;padding:2px 6px;border-radius:999px;margin-left:6px;vertical-align:middle;">COMBO</span>' : ''}</div>
        <div class="table-dish-meta">Cat: ${item.category} | ${item.isCombo ? `${item.comboItems?.length || 0} productos` : `${item.layersOrIngredients?.length || 0} comp.`}</div>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="inline-price-symbol" style="font-weight:700; color:#475569;">${currSymbol}</span>
          <input type="number" class="inline-price-input" data-id="${item.id}" value="${item.price}" step="any">
        </div>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <label class="toggle-switch" title="Cambiar stock">
            <input type="checkbox" class="btn-toggle-stock-checkbox" data-id="${item.id}" ${item.isAvailable ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <span class="status-badge-pill ${item.isAvailable ? 'status-active' : 'status-paused'}">
            ${item.isAvailable ? 'En Stock' : 'Agotado'}
          </span>
        </div>
      </td>
      <td style="text-align: center;">
        <button class="btn-star-featured ${item.isFeatured ? 'featured' : ''}" data-id="${item.id}" title="${item.isFeatured ? 'Quitar de destacados' : 'Marcar como destacado'}">
          <i data-lucide="star"></i>
        </button>
      </td>
      <td style="text-align: right;">
        <div style="display: flex; gap: 6px; justify-content: flex-end;">
          <button class="btn-edit-item btn-admin-secondary" data-id="${item.id}" style="padding: 5px 10px; font-size: 0.78rem;">
            <i data-lucide="edit-3" style="width:13px;height:13px;"></i> Editar
          </button>
          <button class="btn-delete-item btn-admin-danger" data-id="${item.id}" style="padding: 5px 10px; font-size: 0.78rem;">
            <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-toggle-stock-checkbox')?.addEventListener('change', () => {
      const isAvailable = db.toggleAvailability(item.id);
      catalogContext.showToast(isAvailable ? 'Producto activado En Stock' : 'Producto Pausado / Agotado');
      renderCatalogTab();
      catalogContext.onCatalogUpdated();
    });

    tr.querySelector('.btn-star-featured')?.addEventListener('click', () => {
      const isFeatured = db.toggleFeatured(item.id);
      catalogContext.showToast(isFeatured ? 'Plato marcado como Destacado ⭐' : 'Plato removido de Destacados');
      renderCatalogTab();
      catalogContext.onCatalogUpdated();
    });

    const priceInput = tr.querySelector('.inline-price-input');
    const updateInlinePrice = () => {
      const newPrice = parseFloat(priceInput.value);
      if (!isNaN(newPrice) && newPrice >= 0 && newPrice !== item.price) {
        item.price = newPrice;
        item.formattedPrice = `${currSymbol} ${newPrice.toLocaleString('es-AR')}`;
        db.saveItem(item);
        catalogContext.showToast(`Precio de "${item.name}" actualizado a ${currSymbol}${newPrice}`);
        catalogContext.onCatalogUpdated();
      }
    };

    priceInput.addEventListener('change', updateInlinePrice);
    priceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        priceInput.blur();
      }
    });

    tr.querySelector('.btn-edit-item')?.addEventListener('click', () => openDishModal(item));

    tr.querySelector('.btn-delete-item')?.addEventListener('click', () => {
      if (confirm(`¿Eliminar el plato "${item.name}"?`)) {
        db.deleteItem(item.id);
        catalogContext.showToast('Plato eliminado');
        renderCatalogTab();
        catalogContext.onCatalogUpdated();
      }
    });

    tbody.appendChild(tr);
  });

  if (window.lucide) window.lucide.createIcons();
}

function setupBulkPriceHandler() {
  document.getElementById('btnApplyBulkPrice')?.addEventListener('click', () => {
    const percentInput = document.getElementById('bulkPercentInput');
    const percent = parseFloat(percentInput.value);

    if (isNaN(percent) || percent === 0) {
      alert('Ingrese un porcentaje válido');
      return;
    }

    const direction = percent > 0 ? `incrementar un +${percent}%` : `descontar un ${percent}%`;
    if (confirm(`¿Desea ${direction} a los precios de los platos actuales?`)) {
      const currSymbol = catalogContext.getCurrencySymbol() || '$';
      const items = db.getItemsByProfile(catalogContext.getProfileId());
      let count = 0;

      items.forEach((item) => {
        if (catalogState.categoryFilter === 'all' || item.category === catalogState.categoryFilter) {
          const factor = 1 + percent / 100;
          item.price = Math.round(item.price * factor);
          item.formattedPrice = `${currSymbol} ${item.price.toLocaleString('es-AR')}`;
          db.saveItem(item);
          count++;
        }
      });

      catalogContext.showToast(`Se actualizaron ${count} platos con un ${percent}%`);
      renderCatalogTab();
      catalogContext.onCatalogUpdated();
    }
  });
}

function addIngredientRow(data = {}) {
  const container = document.getElementById('ingredientsRowsContainer');
  if (!container) return;

  const card = document.createElement('div');
  card.className = 'component-card-item';
  card.innerHTML = `
    <div class="component-card-header">
      <input type="text" class="ing-name" placeholder="Nombre del componente (ej: Salmón Fresco)" value="${data.name || ''}" required>
      <button type="button" class="btn-remove-layer" title="Eliminar componente">
        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
      </button>
    </div>
    <div class="component-card-details">
      <input type="text" class="ing-desc" placeholder="Descripción (ej: Corte magro rico en Omega-3)" value="${data.description || ''}">
      <input type="text" class="ing-allergen" placeholder="Alérgenos (ej: Pescado)" value="${data.allergenWarning || ''}">
    </div>
  `;

  card.querySelector('.btn-remove-layer').addEventListener('click', () => card.remove());
  container.appendChild(card);
  if (window.lucide) window.lucide.createIcons();
}

function collectIngredientRows() {
  const container = document.getElementById('ingredientsRowsContainer');
  if (!container) return [];

  const cards = container.querySelectorAll('.component-card-item, .layer-item-row');
  const ingredients = [];

  cards.forEach((card) => {
    const name = card.querySelector('.ing-name')?.value.trim();
    const description = card.querySelector('.ing-desc')?.value.trim();
    const allergenWarning = card.querySelector('.ing-allergen')?.value.trim() || null;

    if (name) {
      ingredients.push({
        name,
        description,
        icon: name.toLowerCase().includes('pescado') || name.toLowerCase().includes('salmón') ? 'fish' : 'leaf',
        allergenWarning
      });
    }
  });

  return ingredients;
}

function addVariationRow(data = {}) {
  const container = document.getElementById('variationsRowsContainer');
  if (!container) return;

  const currSymbol = catalogContext.getCurrencySymbol() || '$';
  const row = document.createElement('div');
  row.className = 'variation-row-item';
  row.style.cssText =
    'display: flex; gap: 10px; align-items: center; margin-bottom: 8px; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;';

  row.innerHTML = `
    <div style="flex: 1;">
      <input type="text" class="var-name" placeholder="Nombre (ej: Simple, Doble, 500g)" value="${data.name || ''}" style="width: 100%; padding: 6px 10px; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px;" required>
    </div>
    <div style="width: 130px; position: relative; display: flex; align-items: center;">
      <span style="position: absolute; left: 10px; color: #475569; font-weight: 700; font-size: 0.85rem;" class="inline-price-symbol">${currSymbol}</span>
      <input type="number" class="var-price" placeholder="0" value="${data.price !== undefined ? data.price : ''}" step="100" style="width: 100%; padding: 6px 10px 6px 26px; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px;" required>
    </div>
    <button type="button" class="btn-remove-variation" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;" title="Eliminar variación">
      <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
    </button>
  `;

  row.querySelector('.btn-remove-variation').addEventListener('click', () => row.remove());
  container.appendChild(row);
  if (window.lucide) window.lucide.createIcons();
}

function collectVariationRows() {
  const switchHasVariations = document.getElementById('editHasVariations');
  if (!switchHasVariations || !switchHasVariations.checked) return [];

  const container = document.getElementById('variationsRowsContainer');
  if (!container) return [];

  const rows = container.querySelectorAll('.variation-row-item');
  const variations = [];

  rows.forEach((row) => {
    const name = row.querySelector('.var-name')?.value.trim();
    const price = parseFloat(row.querySelector('.var-price')?.value) || 0;
    if (name) variations.push({ name, price });
  });

  return variations;
}

function populateComboProductSelect(excludeId) {
  const select = document.getElementById('comboProductSelect');
  if (!select) return;
  const items = db
    .getItemsByProfile(catalogContext.getProfileId())
    .filter((i) => i.id !== excludeId && !i.isCombo);
  const currSymbol = catalogContext.getCurrencySymbol() || '$';

  select.innerHTML = '<option value="">Seleccionar producto de la carta...</option>';
  items.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.name} (${currSymbol} ${(Number(item.price) || 0).toLocaleString('es-AR')})${item.isAvailable === false ? ' [Agotado]' : ''}`;
    select.appendChild(opt);
  });
}

function updateComboSavingsSummary() {
  const summaryEl = document.getElementById('comboSavingsSummary');
  if (!summaryEl) return;

  const comboItems = catalogState.editingComboItems || [];
  if (comboItems.length === 0) {
    summaryEl.style.display = 'none';
    return;
  }

  const allItems = db.getItemsByProfile(catalogContext.getProfileId());
  const currSymbol = catalogContext.getCurrencySymbol() || '$';
  const regularTotal = comboItems.reduce((sum, ci) => {
    const product = allItems.find((i) => i.id === ci.itemId);
    return sum + (product ? Number(product.price) || 0 : 0) * (ci.qty || 1);
  }, 0);

  const comboPrice = parseFloat(document.getElementById('editDishPrice')?.value) || 0;
  const savings = regularTotal - comboPrice;
  const pct = regularTotal > 0 && savings > 0 ? Math.round((savings / regularTotal) * 100) : 0;

  summaryEl.style.display = 'block';
  if (savings > 0) {
    summaryEl.innerHTML = `Valor por separado: <strong>${currSymbol} ${regularTotal.toLocaleString('es-AR')}</strong> · El cliente ahorra <strong>${currSymbol} ${savings.toLocaleString('es-AR')} (${pct}% OFF)</strong>`;
  } else {
    summaryEl.innerHTML = `Valor por separado: <strong>${currSymbol} ${regularTotal.toLocaleString('es-AR')}</strong> · Ajustá el precio del combo para generar ahorro.`;
  }
}

function renderComboBuilderItems() {
  const container = document.getElementById('comboItemsContainer');
  if (!container) return;
  container.innerHTML = '';

  const comboItems = catalogState.editingComboItems || [];
  const allItems = db.getItemsByProfile(catalogContext.getProfileId());
  const currSymbol = catalogContext.getCurrencySymbol() || '$';

  if (comboItems.length === 0) {
    container.innerHTML =
      '<div style="font-size:0.8rem; color:#94a3b8; padding:6px 0;">Aún no agregaste productos a este combo.</div>';
    updateComboSavingsSummary();
    return;
  }

  comboItems.forEach((ci, idx) => {
    const product = allItems.find((i) => i.id === ci.itemId);
    const name = product ? product.name : 'Producto no encontrado';
    const unitPrice = product ? Number(product.price) || 0 : 0;

    const row = document.createElement('div');
    row.className = 'variation-row-item';
    row.innerHTML = `
      <span style="font-weight:700; color:#d97706; min-width:34px;">${ci.qty}×</span>
      <span style="flex:1; font-size:0.86rem; font-weight:600;">${name}</span>
      <span style="font-size:0.8rem; color:#64748b;">${currSymbol} ${(unitPrice * ci.qty).toLocaleString('es-AR')}</span>
      <button type="button" class="btn-remove-layer" title="Quitar del combo">
        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
      </button>
    `;
    row.querySelector('.btn-remove-layer').addEventListener('click', () => {
      catalogState.editingComboItems.splice(idx, 1);
      renderComboBuilderItems();
    });
    container.appendChild(row);
  });

  if (window.lucide) window.lucide.createIcons();
  updateComboSavingsSummary();
}

function closeDishModal() {
  document.getElementById('adminDishModal')?.classList.remove('active');
  document.getElementById('adminModalBackdrop')?.classList.remove('active');
}

function openDishModal(item) {
  const modal = document.getElementById('adminDishModal');
  const backdrop = document.getElementById('adminModalBackdrop');
  const categorySelect = document.getElementById('editDishCategory');

  const categories = db.getCategories(catalogContext.getProfileId());
  categorySelect.innerHTML = '';
  categories
    .filter((c) => c.id !== 'all')
    .forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      categorySelect.appendChild(opt);
    });

  const ingredientsContainer = document.getElementById('ingredientsRowsContainer');
  if (ingredientsContainer) ingredientsContainer.innerHTML = '';

  const variationsContainer = document.getElementById('variationsRowsContainer');
  if (variationsContainer) variationsContainer.innerHTML = '';

  const switchHasVar = document.getElementById('editHasVariations');
  const wrapperVar = document.getElementById('variationsWrapper');

  const switchIsCombo = document.getElementById('editIsCombo');
  const wrapperCombo = document.getElementById('comboBuilderWrapper');
  populateComboProductSelect(item ? item.id : null);
  catalogState.editingComboItems =
    item && item.isCombo && Array.isArray(item.comboItems)
      ? JSON.parse(JSON.stringify(item.comboItems))
      : [];
  if (switchIsCombo) switchIsCombo.checked = Boolean(item && item.isCombo);
  if (wrapperCombo) wrapperCombo.style.display = item && item.isCombo ? 'block' : 'none';
  renderComboBuilderItems();

  if (item) {
    catalogState.editingDishId = item.id;
    document.getElementById('adminModalTitle').textContent = 'Editar Plato';
    document.getElementById('editDishId').value = item.id;
    document.getElementById('editDishName').value = item.name;
    document.getElementById('editDishCategory').value = item.category;
    document.getElementById('editDishPrice').value = item.price;
    document.getElementById('editIsFeatured').checked = !!item.isFeatured;
    document.getElementById('editIsAvailable').checked = item.isAvailable !== false;
    document.getElementById('editShortDesc').value = item.shortDescription || '';
    document.getElementById('editFullStory').value = item.fullStory || '';
    document.getElementById('editHeroImage').value = item.media?.heroImage || item.heroImage_url || '';

    const preview = document.getElementById('dishImagePreview');
    const heroImg = resolveAssetUrl(item.media?.heroImage || item.heroImage_url || item.heroImage || '');
    if (preview) {
      if (heroImg) {
        preview.src = heroImg;
        preview.style.display = 'block';
      } else {
        preview.src = '';
        preview.style.display = 'none';
      }
    }

    const flags = item.dietaryFlags || {};
    document.getElementById('dietGlutenFree').checked = !!flags.isGlutenFree;
    document.getElementById('dietVegan').checked = !!flags.isVegan;
    document.getElementById('dietVegetarian').checked = !!flags.isVegetarian;
    document.getElementById('dietDairy').checked = !!flags.containsDairy;
    document.getElementById('dietNuts').checked = !!flags.containsNuts;

    if (item.layersOrIngredients && Array.isArray(item.layersOrIngredients)) {
      item.layersOrIngredients.forEach((ing) => addIngredientRow(ing));
    }

    if (item.hasVariations && Array.isArray(item.variations) && item.variations.length > 0) {
      if (switchHasVar) switchHasVar.checked = true;
      if (wrapperVar) wrapperVar.style.display = 'block';
      item.variations.forEach((v) => addVariationRow(v));
    } else {
      if (switchHasVar) switchHasVar.checked = false;
      if (wrapperVar) wrapperVar.style.display = 'none';
    }
  } else {
    catalogState.editingDishId = null;
    document.getElementById('adminModalTitle').textContent = 'Crear Nuevo Producto';
    document.getElementById('dishEditForm').reset();
    document.getElementById('editDishId').value = '';
    if (switchHasVar) switchHasVar.checked = false;
    if (wrapperVar) wrapperVar.style.display = 'none';
    const preview = document.getElementById('dishImagePreview');
    if (preview) {
      preview.src = '/assets/images/fresh_salmon.png';
      preview.style.display = 'block';
    }
  }

  modal.classList.add('active');
  backdrop.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}

function saveDishData() {
  const name = document.getElementById('editDishName').value.trim();
  const price = parseFloat(document.getElementById('editDishPrice').value) || 0;
  const category = document.getElementById('editDishCategory').value;
  const shortDescription = document.getElementById('editShortDesc').value.trim();
  const fullStory = document.getElementById('editFullStory').value.trim();
  const heroImage = document.getElementById('editHeroImage').value.trim() || null;
  const layersOrIngredients = collectIngredientRows();

  const hasVariations = document.getElementById('editHasVariations')?.checked || false;
  const variations = collectVariationRows();
  const isCombo = document.getElementById('editIsCombo')?.checked || false;
  const comboItems = isCombo ? catalogState.editingComboItems || [] : [];
  const finalPrice = hasVariations && variations.length > 0 ? variations[0].price : price;
  const currSymbol = catalogContext.getCurrencySymbol() || '$';

  const itemData = {
    id: catalogState.editingDishId || undefined,
    businessProfile: catalogContext.getProfileId(),
    name,
    price: finalPrice,
    formattedPrice: `${currSymbol} ${finalPrice.toLocaleString('es-AR')}`,
    hasVariations,
    variations,
    isCombo,
    comboItems,
    category,
    shortDescription,
    fullStory,
    isAvailable: document.getElementById('editIsAvailable').checked,
    isFeatured: document.getElementById('editIsFeatured').checked,
    prepTime: '',
    media: { heroImage },
    layersOrIngredients,
    dietaryFlags: {
      isGlutenFree: document.getElementById('dietGlutenFree').checked,
      isVegan: document.getElementById('dietVegan').checked,
      isVegetarian: document.getElementById('dietVegetarian').checked,
      containsDairy: document.getElementById('dietDairy').checked,
      containsNuts: document.getElementById('dietNuts').checked
    }
  };

  db.saveItem(itemData);
  closeDishModal();
  catalogContext.showToast(catalogState.editingDishId ? 'Plato actualizado' : 'Nuevo plato creado');
  renderCatalogTab();
  catalogContext.onCatalogUpdated();
}

export function initCatalogTab(context = {}) {
  catalogContext = { ...catalogContext, ...context };

  document.getElementById('adminSearchInput')?.addEventListener('input', (e) => {
    catalogState.searchQuery = e.target.value.toLowerCase().trim();
    renderCatalogTab();
  });

  document.getElementById('adminCategoryFilter')?.addEventListener('change', (e) => {
    catalogState.categoryFilter = e.target.value;
    renderCatalogTab();
  });

  document.getElementById('adminStockFilter')?.addEventListener('change', (e) => {
    catalogState.stockFilter = e.target.value;
    renderCatalogTab();
  });

  setupBulkPriceHandler();

  document.getElementById('btnAddNewDish')?.addEventListener('click', () => openDishModal(null));
  document.getElementById('btnCloseAdminModal')?.addEventListener('click', closeDishModal);
  document.getElementById('btnCancelEdit')?.addEventListener('click', closeDishModal);
  document.getElementById('adminModalBackdrop')?.addEventListener('click', closeDishModal);

  document.getElementById('dishEditForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveDishData();
  });

  document.getElementById('btnAddIngredientRow')?.addEventListener('click', () => addIngredientRow());

  const switchHasVariations = document.getElementById('editHasVariations');
  const variationsWrapper = document.getElementById('variationsWrapper');
  switchHasVariations?.addEventListener('change', () => {
    if (variationsWrapper) variationsWrapper.style.display = switchHasVariations.checked ? 'block' : 'none';
    if (switchHasVariations.checked) {
      const container = document.getElementById('variationsRowsContainer');
      if (container && container.children.length === 0) {
        const basePrice = parseFloat(document.getElementById('editDishPrice').value) || 0;
        addVariationRow({ name: 'Simple', price: basePrice || 1000 });
        addVariationRow({ name: 'Doble', price: Math.round((basePrice || 1000) * 1.35) });
      }
    }
  });
  document.getElementById('btnAddVariationRow')?.addEventListener('click', () => addVariationRow());

  const switchCombo = document.getElementById('editIsCombo');
  const wrapperCombo = document.getElementById('comboBuilderWrapper');
  switchCombo?.addEventListener('change', (e) => {
    if (wrapperCombo) wrapperCombo.style.display = e.target.checked ? 'block' : 'none';
    if (e.target.checked) renderComboBuilderItems();
  });

  document.getElementById('btnAddComboItem')?.addEventListener('click', () => {
    const select = document.getElementById('comboProductSelect');
    const qtyInput = document.getElementById('comboProductQty');
    const itemId = select?.value;
    const qty = Math.max(1, parseInt(qtyInput?.value, 10) || 1);
    if (!itemId) return;

    const existing = catalogState.editingComboItems.find((ci) => ci.itemId === itemId);
    if (existing) {
      existing.qty += qty;
    } else {
      catalogState.editingComboItems.push({ itemId, qty });
    }
    if (qtyInput) qtyInput.value = 1;
    if (select) select.value = '';
    renderComboBuilderItems();
  });

  document.getElementById('editDishPrice')?.addEventListener('input', () => {
    if (document.getElementById('editIsCombo')?.checked) updateComboSavingsSummary();
  });

  setupDropzone('dishDropzone', 'dishFileInput', 'dishImagePreview', 'editHeroImage');
  setupDropzone('bannerDropzone', 'bannerFileInput', 'bannerImagePreview', 'bannerImage');
}
