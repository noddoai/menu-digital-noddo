/**
 * AURA & MAISON - LÓGICA DEL PANEL DE ADMINISTRACIÓN (admin.js)
 * Soporta Edición Rápida de Precios Inline, Aumento Masivo de Precios (%), Filtros Avanzados para Cartas Grandes, Popup Centrado y Códigos QR.
 */

import { BUSINESS_PROFILES } from './menuData.js';
import { db } from './db.js';

const adminState = {
  isLoggedIn: false,
  currentProfileId: 'restaurant',
  searchQuery: '',
  categoryFilter: 'all',
  stockFilter: 'all',
  editingDishId: null
};

document.addEventListener('DOMContentLoaded', () => {
  setupLogin();
  setupNavigation();
  setupDishEditor();
  setupBulkPriceHandler();
  setupIngredientRowsHandler();
  setupVariationRowsHandler();
  setupPromoManager();
  setupQrModule();
  setupThemeEditor();
  setupImageDropzones();
  setupQuickStock();
  setupUsersManagement();
});

// ==========================================
// 1. AUTENTICACIÓN
// ==========================================
function setupLogin() {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  // Botones de acceso rápido para pruebas
  document.getElementById('btnQuickDemoBistro')?.addEventListener('click', async () => {
    document.getElementById('loginUser').value = 'admin@gourmetbistro.com';
    document.getElementById('loginPass').value = 'admin123';
    adminState.currentProfileId = 'restaurant';
    const res = await db.loginApi('admin@gourmetbistro.com', 'admin123');
    if (res.success) {
      adminState.isLoggedIn = true;
      sessionStorage.setItem('aura_admin_logged', 'true');
      showDashboard();
      showToast('Sesión iniciada como Gourmet Bistro & Grill');
    }
  });

  document.getElementById('btnQuickDemoCafe')?.addEventListener('click', async () => {
    document.getElementById('loginUser').value = 'admin@maisoncafe.com';
    document.getElementById('loginPass').value = 'admin123';
    adminState.currentProfileId = 'bakery_cafe';
    const res = await db.loginApi('admin@maisoncafe.com', 'admin123');
    if (res.success) {
      adminState.isLoggedIn = true;
      sessionStorage.setItem('aura_admin_logged', 'true');
      showDashboard();
      showToast('Sesión iniciada como Maison Cafe & Bakery');
    }
  });

  if (sessionStorage.getItem('aura_admin_logged') === 'true') {
    adminState.isLoggedIn = true;
    showDashboard();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    const res = await db.loginApi(user, pass);
    if (res.success) {
      adminState.isLoggedIn = true;
      adminState.currentUser = res.user || { role: user === 'staff' ? 'staff' : 'owner' };
      sessionStorage.setItem('aura_admin_logged', 'true');
      sessionStorage.setItem('aura_user_role', adminState.currentUser.role || 'owner');
      loginError.style.display = 'none';
      showDashboard();
    } else {
      loginError.style.display = 'block';
    }
  });

  document.getElementById('btnLogout').addEventListener('click', () => {
    db.logoutApi();
    adminState.isLoggedIn = false;
    sessionStorage.removeItem('aura_user_role');
    document.getElementById('adminDashboardSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'flex';
  });

  document.getElementById('btnResetDefaults').addEventListener('click', () => {
    if (confirm('¿Restablecer los platos y promociones por defecto?')) {
      db.resetToDefaults();
      showToast('Base de datos restablecida a los valores iniciales');
      renderItemsTable();
      renderBannersList();
      renderQuickStockGrid();
    }
  });
}

function showDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('adminDashboardSection').style.display = 'block';

  const userRole = sessionStorage.getItem('aura_user_role') || 'owner';
  applyRolePermissions(userRole);

  populateCategoryFilter();
  renderItemsTable();
  renderQuickStockGrid();
  renderBannersList();
  renderQrCode();
  renderUsersList();
  loadThemeForm();
  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// 2. NAVEGACIÓN, TABS Y FILTROS AVANZADOS
// ==========================================
function populateCategoryFilter() {
  const select = document.getElementById('adminCategoryFilter');
  if (!select) return;

  const profile = adminState.currentProfileId === 'restaurant' ? BUSINESS_PROFILES.RESTAURANT : BUSINESS_PROFILES.BAKERY_CAFE;
  select.innerHTML = '<option value="all">Todas las Categorías</option>';
  profile.categories.filter(c => c.id !== 'all').forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
}

function reloadPhonePreview() {
  const iframe = document.getElementById('phonePreviewIframe');
  if (iframe && iframe.contentWindow) {
    try {
      iframe.contentWindow.location.reload();
    } catch (e) {
      console.log('Error recargando vista previa:', e);
    }
  }
}

function setupNavigation() {
  document.getElementById('btnReloadPhoneFrame')?.addEventListener('click', () => {
    reloadPhonePreview();
    showToast('Vista previa en tiempo real actualizada');
  });

  const profileSelect = document.getElementById('adminProfileSelect');
  profileSelect?.addEventListener('change', (e) => {
    adminState.currentProfileId = e.target.value;
    document.documentElement.dataset.theme = adminState.currentProfileId;
    
    // Actualizar el iframe de vista previa celular al cambiar de local
    const iframe = document.getElementById('phonePreviewIframe');
    if (iframe) {
      iframe.src = adminState.currentProfileId === 'restaurant' ? 'restaurant.html' : 'cafe.html';
    }

    populateCategoryFilter();
    renderItemsTable();
    renderBannersList();
    renderQrCode();
    loadThemeForm();
  });

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      const targetContent = document.getElementById(tabId);
      if (targetContent) targetContent.classList.add('active');

      if (tabId === 'tabQrCode') renderQrCode();
      if (tabId === 'tabPromos') renderBannersList();
      if (tabId === 'tabQuickStock') renderQuickStockGrid();
      if (window.lucide) window.lucide.createIcons();
    });
  });

  document.getElementById('adminSearchInput')?.addEventListener('input', (e) => {
    adminState.searchQuery = e.target.value.toLowerCase().trim();
    renderItemsTable();
  });

  document.getElementById('adminCategoryFilter')?.addEventListener('change', (e) => {
    adminState.categoryFilter = e.target.value;
    renderItemsTable();
  });

  document.getElementById('adminStockFilter')?.addEventListener('change', (e) => {
    adminState.stockFilter = e.target.value;
    renderItemsTable();
  });
}

function updateKpiMetrics() {
  const allProfileItems = db.getItemsByProfile(adminState.currentProfileId);
  const total = allProfileItems.length;
  const available = allProfileItems.filter(i => i.isAvailable).length;
  const featured = allProfileItems.filter(i => i.isFeatured).length;
  const slug = adminState.currentProfileId === 'restaurant' ? 'gourmet-bistro' : 'maison-cafe';

  const elTotal = document.getElementById('kpiTotalDishes');
  const elAvail = document.getElementById('kpiAvailableDishes');
  const elFeat = document.getElementById('kpiFeaturedDishes');
  const elSlug = document.getElementById('kpiSlugName');

  if (elTotal) elTotal.textContent = total;
  if (elAvail) elAvail.textContent = available;
  if (elFeat) elFeat.textContent = featured;
  if (elSlug) elSlug.textContent = slug;
}

// ==========================================
// 3. TABLA CON EDICIÓN RÁPIDA DE PRECIO INLINE
// ==========================================
function renderItemsTable() {
  updateKpiMetrics();
  const tbody = document.getElementById('adminItemsTableBody');
  if (!tbody) return;

  let items = db.getItemsByProfile(adminState.currentProfileId);

  // Filtrado
  items = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(adminState.searchQuery) || (item.shortDescription || '').toLowerCase().includes(adminState.searchQuery);
    const matchesCategory = adminState.categoryFilter === 'all' || item.category === adminState.categoryFilter;
    const matchesStock = adminState.stockFilter === 'all' || (adminState.stockFilter === 'available' ? item.isAvailable : !item.isAvailable);
    return matchesSearch && matchesCategory && matchesStock;
  });

  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: #9ca3af;">No se encontraron platos con los filtros seleccionados.</td></tr>`;
    return;
  }

  const currSymbol = adminState.currencySymbol || '$';
  items.forEach(item => {
    const tr = document.createElement('tr');
    const imgUrl = item.media?.heroImage || item.heroImage_url || item.heroImage || 'assets/images/fresh_salmon.png';

    tr.innerHTML = `
      <td>
        <img src="${imgUrl}" alt="${item.name}" class="table-dish-thumb">
      </td>
      <td>
        <div class="table-dish-name">${item.name}</div>
        <div class="table-dish-meta">Cat: ${item.category} | ${item.layersOrIngredients?.length || 0} comp.</div>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="inline-price-symbol" style="font-weight:700; color:#475569;">${currSymbol}</span>
          <input type="number" class="inline-price-input" data-id="${item.id}" value="${item.price}" step="100">
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

    // Listener para el switch toggle de stock
    const stockCheckbox = tr.querySelector('.btn-toggle-stock-checkbox');
    stockCheckbox?.addEventListener('change', () => {
      const isAvailable = db.toggleAvailability(item.id);
      showToast(isAvailable ? 'Producto activado En Stock' : 'Producto Pausado / Agotado');
      renderItemsTable();
      reloadPhonePreview();
    });

    // Listener para destacar producto (Heurística UX corregida: estrella gris sin destacar, dorada rellena destacada)
    tr.querySelector('.btn-star-featured')?.addEventListener('click', () => {
      const isFeatured = db.toggleFeatured(item.id);
      showToast(isFeatured ? 'Plato marcado como Destacado ⭐' : 'Plato removido de Destacados');
      renderItemsTable();
      reloadPhonePreview();
    });

    // Edición directa de precio al modificar el input inline
    const priceInput = tr.querySelector('.inline-price-input');
    const updateInlinePrice = () => {
      const newPrice = parseFloat(priceInput.value);
      if (!isNaN(newPrice) && newPrice >= 0 && newPrice !== item.price) {
        item.price = newPrice;
        item.formattedPrice = `${currSymbol} ${newPrice.toLocaleString('es-AR')}`;
        db.saveItem(item);
        showToast(`Precio de "${item.name}" actualizado a ${currSymbol}${newPrice}`);
        reloadPhonePreview();
      }
    };

    priceInput.addEventListener('change', updateInlinePrice);
    priceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        priceInput.blur();
      }
    });

    tr.querySelector('.btn-edit-item')?.addEventListener('click', () => {
      openDishModal(item);
    });

    tr.querySelector('.btn-delete-item')?.addEventListener('click', () => {
      if (confirm(`¿Eliminar el plato "${item.name}"?`)) {
        db.deleteItem(item.id);
        showToast('Plato eliminado');
        renderItemsTable();
        reloadPhonePreview();
      }
    });

    tbody.appendChild(tr);
  });

  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// 4. AUMENTO MASIVO DE PRECIOS (%)
// ==========================================
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
      const items = db.getItemsByProfile(adminState.currentProfileId);
      let count = 0;

      items.forEach(item => {
        // Filtrar según categoría activa si no es 'all'
        if (adminState.categoryFilter === 'all' || item.category === adminState.categoryFilter) {
          const factor = 1 + (percent / 100);
          item.price = Math.round(item.price * factor);
          item.formattedPrice = `$ ${item.price.toLocaleString('es-AR')}`;
          db.saveItem(item);
          count++;
        }
      });

      showToast(`Se actualizaron ${count} platos con un ${percent}%`);
      renderItemsTable();
      reloadPhonePreview();
    }
  });
}

// ==========================================
// 5. MODAL POPUP Y GESTOR DE INGREDIENTES
// ==========================================
function setupDishEditor() {
  document.getElementById('btnAddNewDish').addEventListener('click', () => {
    openDishModal(null);
  });

  document.getElementById('btnCloseAdminModal').addEventListener('click', closeDishModal);
  document.getElementById('btnCancelEdit').addEventListener('click', closeDishModal);
  document.getElementById('adminModalBackdrop').addEventListener('click', closeDishModal);

  document.getElementById('dishEditForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveDishData();
  });
}

function openDishModal(item) {
  const modal = document.getElementById('adminDishModal');
  const backdrop = document.getElementById('adminModalBackdrop');
  const categorySelect = document.getElementById('editDishCategory');

  const profile = adminState.currentProfileId === 'restaurant' ? BUSINESS_PROFILES.RESTAURANT : BUSINESS_PROFILES.BAKERY_CAFE;
  categorySelect.innerHTML = '';
  profile.categories.filter(c => c.id !== 'all').forEach(cat => {
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

  if (item) {
    adminState.editingDishId = item.id;
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
    const heroImg = item.media?.heroImage || item.heroImage_url || item.heroImage || 'assets/images/fresh_salmon.png';
    if (preview) {
      preview.src = heroImg;
      preview.style.display = 'block';
    }

    const flags = item.dietaryFlags || {};
    document.getElementById('dietGlutenFree').checked = !!flags.isGlutenFree;
    document.getElementById('dietVegan').checked = !!flags.isVegan;
    document.getElementById('dietVegetarian').checked = !!flags.isVegetarian;
    document.getElementById('dietDairy').checked = !!flags.containsDairy;
    document.getElementById('dietNuts').checked = !!flags.containsNuts;

    if (item.layersOrIngredients && Array.isArray(item.layersOrIngredients)) {
      item.layersOrIngredients.forEach(ing => addIngredientRow(ing));
    }

    if (item.hasVariations && item.variations && Array.isArray(item.variations) && item.variations.length > 0) {
      if (switchHasVar) switchHasVar.checked = true;
      if (wrapperVar) wrapperVar.style.display = 'block';
      item.variations.forEach(v => addVariationRow(v));
    } else {
      if (switchHasVar) switchHasVar.checked = false;
      if (wrapperVar) wrapperVar.style.display = 'none';
    }
  } else {
    adminState.editingDishId = null;
    document.getElementById('adminModalTitle').textContent = 'Crear Nuevo Producto';
    document.getElementById('dishEditForm').reset();
    document.getElementById('editDishId').value = '';
    if (switchHasVar) switchHasVar.checked = false;
    if (wrapperVar) wrapperVar.style.display = 'none';
    const preview = document.getElementById('dishImagePreview');
    if (preview) {
      preview.src = 'assets/images/fresh_salmon.png';
      preview.style.display = 'block';
    }
  }

  modal.classList.add('active');
  backdrop.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}

function closeDishModal() {
  document.getElementById('adminDishModal').classList.remove('active');
  document.getElementById('adminModalBackdrop').classList.remove('active');
}

function setupIngredientRowsHandler() {
  document.getElementById('btnAddIngredientRow')?.addEventListener('click', () => {
    addIngredientRow();
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

  cards.forEach(card => {
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

function setupVariationRowsHandler() {
  const switchHasVariations = document.getElementById('editHasVariations');
  const wrapper = document.getElementById('variationsWrapper');
  const btnAdd = document.getElementById('btnAddVariationRow');

  if (switchHasVariations && wrapper) {
    switchHasVariations.addEventListener('change', () => {
      wrapper.style.display = switchHasVariations.checked ? 'block' : 'none';
      if (switchHasVariations.checked) {
        const container = document.getElementById('variationsRowsContainer');
        if (container && container.children.length === 0) {
          const basePrice = parseFloat(document.getElementById('editDishPrice').value) || 0;
          addVariationRow({ name: 'Simple', price: basePrice || 1000 });
          addVariationRow({ name: 'Doble', price: Math.round((basePrice || 1000) * 1.35) });
        }
      }
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      addVariationRow();
    });
  }
}

function addVariationRow(data = {}) {
  const container = document.getElementById('variationsRowsContainer');
  if (!container) return;

  const currSymbol = adminState.currencySymbol || '$';
  const row = document.createElement('div');
  row.className = 'variation-row-item';
  row.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-bottom: 8px; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;';

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

  rows.forEach(row => {
    const name = row.querySelector('.var-name')?.value.trim();
    const price = parseFloat(row.querySelector('.var-price')?.value) || 0;
    if (name) {
      variations.push({ name, price });
    }
  });

  return variations;
}

function saveDishData() {
  const name = document.getElementById('editDishName').value.trim();
  const price = parseFloat(document.getElementById('editDishPrice').value) || 0;
  const category = document.getElementById('editDishCategory').value;
  const shortDescription = document.getElementById('editShortDesc').value.trim();
  const fullStory = document.getElementById('editFullStory').value.trim();
  const heroImage = document.getElementById('editHeroImage').value.trim() || 'assets/images/fresh_salmon.png';
  const layersOrIngredients = collectIngredientRows();

  const hasVariations = document.getElementById('editHasVariations')?.checked || false;
  const variations = collectVariationRows();
  const finalPrice = (hasVariations && variations.length > 0) ? variations[0].price : price;
  const currSymbol = adminState.currencySymbol || '$';

  const itemData = {
    id: adminState.editingDishId || undefined,
    businessProfile: adminState.currentProfileId,
    name,
    price: finalPrice,
    formattedPrice: `${currSymbol} ${finalPrice.toLocaleString('es-AR')}`,
    hasVariations,
    variations,
    category,
    shortDescription,
    fullStory,
    isAvailable: document.getElementById('editIsAvailable').checked,
    isFeatured: document.getElementById('editIsFeatured').checked,
    isChefSpecial: true,
    prepTime: '20 min',
    rating: 4.8,
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
  showToast(adminState.editingDishId ? 'Plato actualizado' : 'Nuevo plato creado');
  renderItemsTable();
  reloadPhonePreview();
}

// ==========================================
// 6. UPLOADER DRAG AND DROP
// ==========================================
function setupImageDropzones() {
  setupDropzone('dishDropzone', 'dishFileInput', 'dishImagePreview', 'editHeroImage');
  setupDropzone('bannerDropzone', 'bannerFileInput', 'bannerImagePreview', 'bannerImage');
}

function setupDropzone(boxId, fileInputId, previewImgId, hiddenInputId) {
  const box = document.getElementById(boxId);
  const fileInput = document.getElementById(fileInputId);
  const preview = document.getElementById(previewImgId);
  const hiddenInput = document.getElementById(hiddenInputId);

  if (!box || !fileInput) return;

  box.addEventListener('click', () => fileInput.click());

  box.addEventListener('dragover', (e) => {
    e.preventDefault();
    box.classList.add('drag-over');
  });

  box.addEventListener('dragleave', () => box.classList.remove('drag-over'));

  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0], preview, hiddenInput);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0], preview, hiddenInput);
    }
  });
}

function handleFile(file, previewImg, hiddenInput) {
  if (!file.type.startsWith('image/')) {
    alert('Por favor seleccione una imagen válida');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    if (previewImg) {
      previewImg.src = dataUrl;
      previewImg.style.display = 'block';
    }
    if (hiddenInput) {
      hiddenInput.value = dataUrl;
    }
  };
  reader.readAsDataURL(file);
}

// ==========================================
// 7. BANNERS Y CÓDIGO QR
// ==========================================
function setupPromoManager() {
  const promoForm = document.getElementById('promoBannerForm');
  if (promoForm) {
    promoForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const bannerData = {
        id: document.getElementById('editBannerId').value || undefined,
        enabled: true,
        title: document.getElementById('bannerTitle').value.trim(),
        image: document.getElementById('bannerImage').value.trim() || 'assets/images/fresh_salmon.png'
      };

      db.saveSinglePromoBanner(adminState.currentProfileId, bannerData);
      promoForm.reset();
      document.getElementById('editBannerId').value = '';
      const preview = document.getElementById('bannerImagePreview');
      if (preview) preview.style.display = 'none';

      showToast('Banner promocional guardado');
      renderBannersList();
      reloadPhonePreview();
    });
  }
}

function renderBannersList() {
  const container = document.getElementById('activeBannersList');
  if (!container) return;

  const banners = db.getPromoBanners(adminState.currentProfileId);
  container.innerHTML = '';

  if (banners.length === 0) {
    container.innerHTML = '<p style="font-size:0.85rem; color:#9ca3af;">No hay banners promocionales cargados.</p>';
    return;
  }

  banners.forEach(b => {
    const card = document.createElement('div');
    card.style.background = '#ffffff';
    card.style.border = '1px solid #e2e8f0';
    card.style.padding = '12px';
    card.style.borderRadius = '10px';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.gap = '12px';

    card.innerHTML = `
      <img src="${b.image}" style="width:80px; height:45px; object-fit:cover; border-radius:6px;">
      <div style="flex-grow:1;">
        <div style="font-weight:700; font-size:0.88rem; color:#0f172a;">${b.title || 'Banner Promocional'}</div>
      </div>
      <button class="btn-delete-banner btn-admin-danger" style="padding:6px 10px; font-size:0.75rem;">
        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
      </button>
    `;

    card.querySelector('.btn-delete-banner').addEventListener('click', () => {
      db.deletePromoBanner(adminState.currentProfileId, b.id);
      showToast('Banner eliminado');
      renderBannersList();
      reloadPhonePreview();
    });

    container.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

function setupQrModule() {
  const btnPng = document.getElementById('btnDownloadQrPng');
  const btnSvg = document.getElementById('btnDownloadQrSvg');

  if (btnPng) btnPng.addEventListener('click', () => downloadQr('png'));
  if (btnSvg) btnSvg.addEventListener('click', () => downloadQr('svg'));
}

function renderQrCode() {
  const qrImg = document.getElementById('qrCodeImage');
  const urlText = document.getElementById('qrTargetUrlText');
  if (!qrImg) return;

  const targetPage = adminState.currentProfileId === 'restaurant' ? 'restaurant.html' : 'cafe.html';
  const fullUrl = `${window.location.origin}/${targetPage}`;

  if (urlText) urlText.textContent = fullUrl;

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(fullUrl)}&format=png&color=20-117-103`;
  qrImg.src = qrApiUrl;
}

function downloadQr(format) {
  const targetPage = adminState.currentProfileId === 'restaurant' ? 'restaurant.html' : 'cafe.html';
  const fullUrl = `${window.location.origin}/${targetPage}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(fullUrl)}&format=${format}&color=20-117-103`;

  const a = document.createElement('a');
  a.href = qrApiUrl;
  a.download = `QR-Menu-${adminState.currentProfileId}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`Descargando Código QR (${format.toUpperCase()})`);
}

function updateGlobalCurrencySymbol(symbol) {
  adminState.currencySymbol = symbol || '$';
  document.querySelectorAll('.price-symbol, .currency-symbol-label, .currency-symbol-inline, .inline-price-symbol').forEach(el => {
    el.textContent = adminState.currencySymbol;
  });
}

function setupThemeEditor() {
  const form = document.getElementById('themeConfigForm');
  if (!form) return;

  const colorInput = document.getElementById('inputAccentColor');
  const textInput = document.getElementById('inputAccentColorText');
  const currencySelect = document.getElementById('inputCurrency');

  colorInput.addEventListener('input', (e) => textInput.value = e.target.value);
  textInput.addEventListener('input', (e) => colorInput.value = e.target.value);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const symbol = currencySelect ? currencySelect.value : '$';
    const code = currencySelect && currencySelect.options[currencySelect.selectedIndex] 
      ? currencySelect.options[currencySelect.selectedIndex].dataset.code || 'ARS' 
      : 'ARS';

    const config = {
      name: document.getElementById('inputBrandName').value.trim(),
      tagline: document.getElementById('inputBrandTagline').value.trim(),
      accentColor: colorInput.value,
      currencySymbol: symbol,
      currencyCode: code
    };
    db.saveThemeConfig(adminState.currentProfileId, config);
    updateGlobalCurrencySymbol(symbol);
    renderItemsTable();
    showToast(`Configuración guardada (Moneda: ${code} ${symbol})`);
    reloadPhonePreview();
  });
}

function loadThemeForm() {
  const config = db.getThemeConfig(adminState.currentProfileId);
  adminState.currencySymbol = config.currencySymbol || '$';

  if (document.getElementById('inputBrandName')) {
    document.getElementById('inputBrandName').value = config.name || '';
    document.getElementById('inputBrandTagline').value = config.tagline || '';
    document.getElementById('inputAccentColor').value = config.accentColor || '#207567';
    document.getElementById('inputAccentColorText').value = config.accentColor || '#207567';
  }

  const currencySelect = document.getElementById('inputCurrency');
  if (currencySelect) {
    for (let opt of currencySelect.options) {
      if (opt.dataset.code === config.currencyCode || (config.currencySymbol && opt.value === config.currencySymbol)) {
        opt.selected = true;
        break;
      }
    }
  }

  updateGlobalCurrencySymbol(adminState.currencySymbol);
}

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  const text = document.getElementById('toastMessage');
  if (toast && text) {
    text.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

// ==========================================
// 8. CONTROL DE ROLES Y PERMISOS (RBAC)
// ==========================================
function applyRolePermissions(role) {
  const isStaff = role === 'staff';

  // Si es Staff (Empleado), ocultamos la pestaña de usuarios, temas y deshabilitamos edición de precios masivos
  const navUsers = document.getElementById('navTabUsers');
  const navStyles = document.getElementById('navTabStyles');
  const navQuickStock = document.getElementById('navTabQuickStock');

  if (navUsers) navUsers.style.display = isStaff ? 'none' : 'flex';
  if (navStyles) navStyles.style.display = isStaff ? 'none' : 'flex';

  if (isStaff) {
    // Activar pestaña Pausa Rápida por defecto para Staff
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    if (navQuickStock) navQuickStock.classList.add('active');
    const tabQuickContent = document.getElementById('tabQuickStock');
    if (tabQuickContent) tabQuickContent.classList.add('active');
  }
}

// ==========================================
// 9. MODO PAUSA RÁPIDA DE STOCK (BARRA / COCINA)
// ==========================================
function setupQuickStock() {
  const searchInput = document.getElementById('quickStockSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderQuickStockGrid(e.target.value.toLowerCase().trim());
    });
  }
}

function renderQuickStockGrid(query = '') {
  const grid = document.getElementById('quickStockGrid');
  if (!grid) return;

  let items = db.getItemsByProfile(adminState.currentProfileId);
  if (query) {
    items = items.filter(i => i.name.toLowerCase().includes(query) || (i.shortDescription || '').toLowerCase().includes(query));
  }

  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; color: #64748b; text-align: center; padding: 24px;">No hay productos coincidentes con la búsqueda.</div>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'quick-stock-card';

    const imgUrl = item.media?.heroImage || item.heroImage_url || item.heroImage || 'assets/images/fresh_salmon.png';

    card.innerHTML = `
      <img src="${imgUrl}" alt="${item.name}">
      <div class="quick-stock-info">
        <div class="quick-stock-name">${item.name}</div>
        <div class="quick-stock-price">${adminState.currencySymbol || '$'} ${item.price.toLocaleString('es-AR')}</div>
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
      showToast(newStatus ? `Producto "${item.name}" activado` : `Producto "${item.name}" pausado`);
      renderQuickStockGrid(query);
      renderItemsTable();
      reloadPhonePreview();
    });

    grid.appendChild(card);
  });
}


// ==========================================
// 10. GESTIÓN DE PERSONAL Y EMPLEADOS
// ==========================================
const STAFF_STORAGE_KEY = 'aura_staff_users_v1';

function getStaffUsers() {
  try {
    const data = localStorage.getItem(STAFF_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error leyendo usuarios de staff:', e);
  }
  return [
    { id: 'u-staff-1', name: 'Lucas Mozo Barra', email: 'barra@gourmetbistro.com', role: 'staff', createdAt: new Date().toISOString() },
    { id: 'u-staff-2', name: 'Sofia Encargada', email: 'encargada@gourmetbistro.com', role: 'manager', createdAt: new Date().toISOString() }
  ];
}

function saveStaffUsers(users) {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error guardando usuarios de staff:', e);
  }
}

function setupUsersManagement() {
  const form = document.getElementById('addUserForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const role = document.getElementById('newUserRole').value;

    if (!name || !email) return;

    const users = getStaffUsers();
    users.unshift({
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      createdAt: new Date().toISOString()
    });

    saveStaffUsers(users);
    showToast(`Empleado "${name}" registrado correctamente`);
    form.reset();
    renderUsersList();
  });
}

function renderUsersList() {
  const container = document.getElementById('usersListContainer');
  if (!container) return;

  const users = getStaffUsers();
  container.innerHTML = '';

  if (users.length === 0) {
    container.innerHTML = `<div style="color: #9ca3af; font-size: 0.88rem;">No hay personal adicional registrado.</div>`;
    return;
  }

  users.forEach(user => {
    const div = document.createElement('div');
    div.style.cssText = `
      background: #1f2937;
      border: 1px solid #374151;
      padding: 12px 16px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const roleBadge = user.role === 'manager' 
      ? '<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight:700;">🛠️ MANAGER</span>'
      : '<span style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight:700;">🔒 STAFF BARRA</span>';

    div.innerHTML = `
      <div>
        <div style="font-weight: 700; font-size: 0.9rem; color: #fff;">${user.name} ${roleBadge}</div>
        <div style="font-size: 0.8rem; color: #9ca3af;">${user.email}</div>
      </div>
      <button class="btn-delete-user btn-admin-danger" data-id="${user.id}" style="padding: 4px 8px; font-size: 0.75rem;">
        <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
      </button>
    `;

    div.querySelector('.btn-delete-user').addEventListener('click', () => {
      if (confirm(`¿Eliminar acceso a ${user.name}?`)) {
        const filtered = getStaffUsers().filter(u => u.id !== user.id);
        saveStaffUsers(filtered);
        showToast('Empleado eliminado');
        renderUsersList();
      }
    });

    container.appendChild(div);
  });

  if (window.lucide) window.lucide.createIcons();
}
