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
  setupConfigSubtabs();
  setupGeneralConfigForm();
  setupThemeEditor();
  setupCategoriesManagement();
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

  const categories = db.getCategories(adminState.currentProfileId);
  select.innerHTML = '<option value="all">Todas las Categorías</option>';
  categories.filter(c => c.id !== 'all').forEach(cat => {
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

  const categories = db.getCategories(adminState.currentProfileId);
  categorySelect.innerHTML = '';
  categories.filter(c => c.id !== 'all').forEach(cat => {
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
// 7. BANNERS PROMOCIONALES & CÓDIGO QR
// ==========================================
let currentCropImage = null;

function setupPromoManager() {
  const btnOpenModal = document.getElementById('btnOpenBannerModal');
  const btnCloseModal = document.getElementById('btnCloseBannerCropModal');
  const btnCancelModal = document.getElementById('btnCancelBannerCropModal');
  const backdrop = document.getElementById('bannerCropModalBackdrop');
  const modal = document.getElementById('bannerCropModal');
  const fileInput = document.getElementById('cropFileInput');
  const cropArea = document.getElementById('cropAreaWrapper');
  const canvas = document.getElementById('bannerCropCanvas');
  const sliderOffsetY = document.getElementById('sliderOffsetY');
  const sliderZoom = document.getElementById('sliderZoom');
  const valOffsetY = document.getElementById('valOffsetY');
  const valZoom = document.getElementById('valZoom');
  const btnSave = document.getElementById('btnSaveCroppedBanner');

  function openCropModal() {
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.style.transform = 'translate(-50%, -50%) scale(1)';
    backdrop.classList.add('active');
    if (fileInput) fileInput.value = '';
    if (cropArea) cropArea.style.display = 'none';
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.style.opacity = '0.5';
    }
    currentCropImage = null;
  }

  function closeCropModal() {
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
    backdrop.classList.remove('active');
  }

  if (btnOpenModal) btnOpenModal.addEventListener('click', openCropModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeCropModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeCropModal);
  if (backdrop) backdrop.addEventListener('click', closeCropModal);

  function drawCroppedImage() {
    if (!currentCropImage || !canvas) return;
    const ctx = canvas.getContext('2d');
    const targetW = 1200;
    const targetH = 450;

    const zoom = parseFloat(sliderZoom.value) / 100;
    const offsetYPercent = parseFloat(sliderOffsetY.value) / 100;

    ctx.clearRect(0, 0, targetW, targetH);

    const imgW = currentCropImage.width;
    const imgH = currentCropImage.height;

    const targetRatio = targetW / targetH;
    const imgRatio = imgW / imgH;

    let drawWidth, drawHeight;

    if (imgRatio > targetRatio) {
      drawHeight = targetH * zoom;
      drawWidth = drawHeight * imgRatio;
    } else {
      drawWidth = targetW * zoom;
      drawHeight = drawWidth / imgRatio;
    }

    const extraX = drawWidth - targetW;
    const extraY = drawHeight - targetH;

    const drawX = -(extraX / 2);
    const drawY = -(extraY * offsetYPercent);

    ctx.drawImage(currentCropImage, drawX, drawY, drawWidth, drawHeight);
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Por favor seleccione una imagen válida');
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          currentCropImage = img;
          cropArea.style.display = 'block';
          sliderOffsetY.value = 50;
          sliderZoom.value = 100;
          valOffsetY.textContent = '50%';
          valZoom.textContent = '100%';
          btnSave.disabled = false;
          btnSave.style.opacity = '1';
          drawCroppedImage();
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (sliderOffsetY) {
    sliderOffsetY.addEventListener('input', (e) => {
      valOffsetY.textContent = `${e.target.value}%`;
      drawCroppedImage();
    });
  }

  if (sliderZoom) {
    sliderZoom.addEventListener('input', (e) => {
      valZoom.textContent = `${e.target.value}%`;
      drawCroppedImage();
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (!currentCropImage || !canvas) return;
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.88);

      const banners = db.getPromoBanners(adminState.currentProfileId) || [];
      const newBanner = {
        id: `banner-${Date.now()}`,
        enabled: true,
        image: croppedBase64
      };

      banners.unshift(newBanner);
      db.savePromoBanners(adminState.currentProfileId, banners);

      closeCropModal();
      showToast('Nuevo banner promocional guardado y encuadrado');
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

  if (!banners || banners.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #64748b; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
        <i data-lucide="image" style="width: 40px; height: 40px; margin-bottom: 8px; opacity: 0.5;"></i>
        <h4 style="font-size: 1rem; color: #1e293b; margin-bottom: 4px;">No hay banners promocionales cargados</h4>
        <p style="font-size: 0.85rem;">Haga clic en "+ Subir Nuevo" para publicar ofertas o eventos.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  banners.forEach((banner) => {
    const card = document.createElement('div');
    card.className = 'banner-item-card';

    card.innerHTML = `
      <div class="banner-card-media">
        <img src="${banner.image}" alt="Banner promocional">
        <span class="banner-status-badge ${banner.enabled !== false ? 'active' : 'inactive'}">
          ${banner.enabled !== false ? 'Activo en Carta' : 'Desactivado'}
        </span>
      </div>
      <div class="banner-card-actions">
        <div style="display: flex; align-items: center; gap: 8px;">
          <label class="toggle-switch" title="Activar/Desactivar banner">
            <input type="checkbox" class="btn-toggle-banner" data-id="${banner.id}" ${banner.enabled !== false ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <span style="font-size: 0.82rem; font-weight: 600; color: #475569;">
            ${banner.enabled !== false ? 'Visible' : 'Oculto'}
          </span>
        </div>
        <button type="button" class="btn-delete-banner btn-admin-danger" data-id="${banner.id}" style="padding: 6px 12px; font-size: 0.78rem;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Eliminar
        </button>
      </div>
    `;

    card.querySelector('.btn-toggle-banner').addEventListener('change', (e) => {
      banner.enabled = e.target.checked;
      db.savePromoBanners(adminState.currentProfileId, banners);
      showToast(e.target.checked ? 'Banner activado en la carta' : 'Banner desactivado');
      renderBannersList();
      reloadPhonePreview();
    });

    card.querySelector('.btn-delete-banner').addEventListener('click', () => {
      if (confirm('¿Eliminar este banner promocional?')) {
        const updated = banners.filter(b => b.id !== banner.id);
        db.savePromoBanners(adminState.currentProfileId, updated);
        showToast('Banner eliminado');
        renderBannersList();
        reloadPhonePreview();
      }
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

function getContrastColor(hexColor) {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0f172a' : '#ffffff';
}

function updateGlobalCurrencySymbol(symbol) {
  adminState.currencySymbol = symbol || '$';
  document.querySelectorAll('.price-symbol, .currency-symbol-label, .currency-symbol-inline, .inline-price-symbol').forEach(el => {
    el.textContent = adminState.currencySymbol;
  });
}

// ==========================================
// PALETA DE 20 COLORES PRECONFIGURADOS & SUB-PESTAÑAS DE CONFIGURACIÓN
// ==========================================
const PALETTE_20_COLORS = [
  { hex: '#ffffff', label: 'Blanco Puro' },
  { hex: '#207567', label: 'Teal Esmeralda' },
  { hex: '#0284c7', label: 'Azul Celeste' },
  { hex: '#3b82f6', label: 'Azul Real' },
  { hex: '#6366f1', label: 'Índigo' },
  { hex: '#8b5cf6', label: 'Púrpura' },
  { hex: '#d946ef', label: 'Fucsia' },
  { hex: '#e11d48', label: 'Rojo Rubí' },
  { hex: '#ea580c', label: 'Naranja Coral' },
  { hex: '#f59e0b', label: 'Ámbar Cálido' },
  { hex: '#10b981', label: 'Verde Esmeralda' },
  { hex: '#06b6d4', label: 'Cian Eléctrico' },
  { hex: '#16a34a', label: 'Verde Hoja' },
  { hex: '#ca8a04', label: 'Dorado Bronce' },
  { hex: '#9333ea', label: 'Violeta Intenso' },
  { hex: '#0d9488', label: 'Verde Jade' },
  { hex: '#ec4899', label: 'Rosa Intenso' },
  { hex: '#ef4444', label: 'Rojo Carmesí' },
  { hex: '#84cc16', label: 'Verde Lima' },
  { hex: '#0f172a', label: 'Negro Azabache' }
];

function setupConfigSubtabs() {
  document.querySelectorAll('.config-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.config-subtab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.config-subtab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const subtabId = btn.dataset.subtab;
      const targetContent = document.getElementById(subtabId);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
      }

      document.querySelectorAll('.config-subtab-content').forEach(c => {
        if (c.id !== subtabId) c.style.display = 'none';
      });

      if (window.lucide) window.lucide.createIcons();
    });
  });
}

function render20ColorSwatches(selectedHex) {
  const container = document.getElementById('swatchesGrid20');
  if (!container) return;

  container.innerHTML = '';
  const activeColor = (selectedHex || '#207567').toLowerCase();

  PALETTE_20_COLORS.forEach(colorItem => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isWhite = colorItem.hex.toLowerCase() === '#ffffff';
    btn.className = `swatch-btn-20 ${colorItem.hex.toLowerCase() === activeColor ? 'active' : ''} ${isWhite ? 'is-white-swatch' : ''}`;
    btn.style.backgroundColor = colorItem.hex;
    btn.dataset.color = colorItem.hex;
    btn.title = colorItem.label;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.swatch-btn-20').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const inputAccent = document.getElementById('inputAccentColor');
      if (inputAccent) inputAccent.value = colorItem.hex;
    });

    container.appendChild(btn);
  });
}

function setupGeneralConfigForm() {
  const form = document.getElementById('generalConfigForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('inputBrandName').value.trim();
    const tagline = document.getElementById('inputBrandTagline').value.trim();
    const menuIsActive = document.getElementById('inputMenuIsActive').checked;

    const currentConfig = db.getThemeConfig(adminState.currentProfileId);
    const updatedConfig = {
      ...currentConfig,
      name,
      tagline,
      menuIsActive
    };

    db.saveThemeConfig(adminState.currentProfileId, updatedConfig);
    showToast('Datos generales del comercio guardados exitosamente');
    reloadPhonePreview();
  });
}

function setupCategoriesManagement() {
  const form = document.getElementById('addCategoryForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newCategoryName');
    const categoryName = input ? input.value.trim() : '';

    if (!categoryName) return;

    db.addCategory(adminState.currentProfileId, categoryName);
    showToast(`Categoría "${categoryName}" creada exitosamente`);
    input.value = '';
    
    renderCategoriesList();
    populateCategoryFilter();
    reloadPhonePreview();
  });
}

function renderCategoriesList() {
  const stack = document.getElementById('categoriesListStack');
  if (!stack) return;

  const categories = db.getCategories(adminState.currentProfileId);
  const dishes = db.getItemsByProfile(adminState.currentProfileId);

  stack.innerHTML = '';

  categories.forEach(cat => {
    if (cat.id === 'all') return; // no listar 'todas' como categoría a borrar

    const count = dishes.filter(d => d.category === cat.id).length;

    const row = document.createElement('div');
    row.className = 'category-item-row';

    row.innerHTML = `
      <div class="category-item-info">
        <div class="category-item-name">${cat.name}</div>
        <div class="category-item-count">${count} plato(s) asociado(s)</div>
      </div>
      <button type="button" class="btn-admin-danger btn-delete-category" data-cat-id="${cat.id}" style="padding: 5px 10px; font-size: 0.75rem;">
        <i data-lucide="trash-2" style="width:12px;height:12px;"></i> Eliminar
      </button>
    `;

    row.querySelector('.btn-delete-category').addEventListener('click', () => {
      if (confirm(`¿Está seguro de eliminar la categoría "${cat.name}"?`)) {
        db.deleteCategory(adminState.currentProfileId, cat.id);
        showToast(`Categoría "${cat.name}" eliminada`);
        renderCategoriesList();
        populateCategoryFilter();
        reloadPhonePreview();
      }
    });

    stack.appendChild(row);
  });

  if (window.lucide) window.lucide.createIcons();
}

function setupThemeEditor() {
  const form = document.getElementById('themeConfigForm');
  if (!form) return;

  const colorInput = document.getElementById('inputAccentColor');
  const currencySelect = document.getElementById('inputCurrency');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const symbol = currencySelect ? currencySelect.value : '$';
    const code = currencySelect && currencySelect.options[currencySelect.selectedIndex] 
      ? currencySelect.options[currencySelect.selectedIndex].dataset.code || 'ARS' 
      : 'ARS';

    const inputShowPrepTime = document.getElementById('inputShowPrepTime');
    const inputThemeMode = document.getElementById('inputThemeMode');

    const currentConfig = db.getThemeConfig(adminState.currentProfileId);

    const config = {
      ...currentConfig,
      accentColor: colorInput ? colorInput.value : '#207567',
      currencySymbol: symbol,
      currencyCode: code,
      themeMode: inputThemeMode ? inputThemeMode.value : 'dark',
      showPrepTime: inputShowPrepTime ? inputShowPrepTime.checked : true
    };

    db.saveThemeConfig(adminState.currentProfileId, config);
    updateGlobalCurrencySymbol(symbol);
    renderItemsTable();
    showToast(`Configuración del menú guardada (${code} ${symbol})`);
    reloadPhonePreview();
  });
}

function loadThemeForm() {
  const config = db.getThemeConfig(adminState.currentProfileId);
  adminState.currencySymbol = config.currencySymbol || '$';
  const savedAccentColor = config.accentColor || '#207567';

  if (document.getElementById('inputBrandName')) {
    document.getElementById('inputBrandName').value = config.name || '';
  }
  if (document.getElementById('inputBrandTagline')) {
    document.getElementById('inputBrandTagline').value = config.tagline || '';
  }
  if (document.getElementById('inputMenuIsActive')) {
    document.getElementById('inputMenuIsActive').checked = config.menuIsActive !== false;
  }

  const inputThemeMode = document.getElementById('inputThemeMode');
  if (inputThemeMode) {
    inputThemeMode.value = config.themeMode || (adminState.currentProfileId === 'restaurant' ? 'dark' : 'light');
  }

  const inputShowPrepTime = document.getElementById('inputShowPrepTime');
  if (inputShowPrepTime) {
    inputShowPrepTime.checked = config.showPrepTime !== false;
  }

  if (document.getElementById('inputAccentColor')) {
    document.getElementById('inputAccentColor').value = savedAccentColor;
  }

  render20ColorSwatches(savedAccentColor);

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
  renderCategoriesList();
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

  const profile = adminState.currentProfileId === 'restaurant' ? BUSINESS_PROFILES.RESTAURANT : BUSINESS_PROFILES.BAKERY_CAFE;
  let items = db.getItemsByProfile(adminState.currentProfileId);

  if (query) {
    items = items.filter(i => i.name.toLowerCase().includes(query) || (i.shortDescription || '').toLowerCase().includes(query));
  }

  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; color: #64748b; text-align: center; padding: 24px;">No hay productos coincidentes con la búsqueda.</div>`;
    return;
  }

  // Agrupar productos por categoría conservando el orden del perfil
  const categoriesMap = new Map();
  profile.categories.filter(c => c.id !== 'all').forEach(cat => {
    categoriesMap.set(cat.id, { name: cat.name, icon: cat.icon || 'tag', items: [] });
  });
  categoriesMap.set('otros', { name: 'Otros / Sin Categoría', icon: 'grid', items: [] });

  items.forEach(item => {
    const catKey = item.category && categoriesMap.has(item.category) ? item.category : 'otros';
    categoriesMap.get(catKey).items.push(item);
  });

  const currSymbol = adminState.currencySymbol || '$';

  categoriesMap.forEach((catData) => {
    if (catData.items.length === 0) return;

    // Divisor fino con nombre de categoría al mismo nivel
    const divider = document.createElement('div');
    divider.className = 'category-divider-row';
    divider.innerHTML = `
      <span class="category-divider-title">
        <i data-lucide="${catData.icon}"></i> ${catData.name}
      </span>
      <div class="category-divider-line"></div>
    `;
    grid.appendChild(divider);

    // Tarjetas de platos de esta categoría
    catData.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'quick-stock-card';

      const imgUrl = item.media?.heroImage || item.heroImage_url || item.heroImage || 'assets/images/fresh_salmon.png';

      card.innerHTML = `
        <img src="${imgUrl}" alt="${item.name}">
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
        showToast(newStatus ? `Producto "${item.name}" activado` : `Producto "${item.name}" pausado`);
        renderQuickStockGrid(query);
        renderItemsTable();
        reloadPhonePreview();
      });

      grid.appendChild(card);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}


// ==========================================
// 10. GESTIÓN DE PERSONAL Y EMPLEADOS
// ==========================================
const STAFF_STORAGE_KEY = 'aura_staff_users_v1';

// ==========================================
// 10. GESTIÓN DE PERSONAL, EMPLEADOS Y SEGURIDAD
// ==========================================
const STAFF_STORAGE_KEY = 'aura_staff_users_v1';
const revealedStaffPasswords = new Set();

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

function getStaffUsers() {
  try {
    const data = localStorage.getItem(STAFF_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error leyendo usuarios de staff:', e);
  }
  return [
    { id: 'u-staff-1', name: 'Lucas Mozo Barra', email: 'barra@gourmetbistro.com', password: 'barra123password', role: 'staff', createdAt: new Date().toISOString() },
    { id: 'u-staff-2', name: 'Sofía Encargada', email: 'encargada@gourmetbistro.com', password: 'manager456secret', role: 'manager', createdAt: new Date().toISOString() }
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
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('newUserName').value.trim();
      const email = document.getElementById('newUserEmail').value.trim();
      const password = document.getElementById('newUserPassword').value.trim();
      const role = document.getElementById('newUserRole').value;

      if (!name || !email || !password) return;

      const users = getStaffUsers();
      users.unshift({
        id: `user-${Date.now()}`,
        name,
        email,
        password,
        role,
        createdAt: new Date().toISOString()
      });

      saveStaffUsers(users);
      showToast(`Empleado "${name}" registrado correctamente`);
      form.reset();
      renderUsersList();
    });
  }

  // Modal de Verificación de Seguridad
  const modal = document.getElementById('revealPasswordModal');
  const backdrop = document.getElementById('revealPasswordModalBackdrop');
  const closeBtn = document.getElementById('btnCloseRevealModal');
  const cancelBtn = document.getElementById('btnCancelRevealModal');
  const revealForm = document.getElementById('revealPasswordForm');

  const closeRevealModal = () => {
    if (modal) modal.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';
    const confirmInput = document.getElementById('adminConfirmPassword');
    if (confirmInput) confirmInput.value = '';
    const errDiv = document.getElementById('revealPasswordError');
    if (errDiv) errDiv.style.display = 'none';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeRevealModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeRevealModal);
  if (backdrop) backdrop.addEventListener('click', closeRevealModal);

  if (revealForm) {
    revealForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPass = document.getElementById('adminConfirmPassword').value.trim();
      const targetUserId = document.getElementById('targetStaffUserId').value;

      // Validar contraseña del administrador actual
      if (enteredPass === 'admin123' || enteredPass === 'admin' || enteredPass === '123456') {
        revealedStaffPasswords.add(targetUserId);
        closeRevealModal();
        showToast('🔓 Contraseña de empleado revelada');
        renderUsersList();
      } else {
        const errorDiv = document.getElementById('revealPasswordError');
        if (errorDiv) errorDiv.style.display = 'block';
      }
    });
  }
}

function openRevealPasswordModal(userId) {
  const modal = document.getElementById('revealPasswordModal');
  const backdrop = document.getElementById('revealPasswordModalBackdrop');
  const targetInput = document.getElementById('targetStaffUserId');

  if (targetInput) targetInput.value = userId;
  if (modal) modal.style.display = 'block';
  if (backdrop) backdrop.style.display = 'block';
  const inputPass = document.getElementById('adminConfirmPassword');
  if (inputPass) {
    inputPass.value = '';
    inputPass.focus();
  }
  const errorDiv = document.getElementById('revealPasswordError');
  if (errorDiv) errorDiv.style.display = 'none';
}

function renderUsersList() {
  const container = document.getElementById('usersListContainer');
  if (!container) return;

  const users = getStaffUsers();
  container.innerHTML = '';

  if (users.length === 0) {
    container.innerHTML = `<div style="color: #9ca3af; font-size: 0.88rem; padding: 12px 0;">No hay personal adicional registrado.</div>`;
    return;
  }

  users.forEach(user => {
    const isRevealed = revealedStaffPasswords.has(user.id);
    const maskedMail = maskEmail(user.email);
    const passDisplay = isRevealed ? (user.password || 'Sin clave') : '••••••••';

    const card = document.createElement('div');
    card.className = 'staff-user-card';

    const roleBadge = user.role === 'manager' 
      ? '<span style="background: rgba(56, 189, 248, 0.15); color: #0284c7; font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; font-weight:700;">🛠️ ENCARGADO</span>'
      : '<span style="background: rgba(251, 191, 36, 0.15); color: #d97706; font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; font-weight:700;">🔒 STAFF BARRA</span>';

    card.innerHTML = `
      <div class="staff-user-header">
        <div class="staff-user-name">${user.name} ${roleBadge}</div>
        <button type="button" class="btn-delete-user btn-admin-danger" data-id="${user.id}" style="padding: 5px 10px; font-size: 0.75rem;">
          <i data-lucide="trash-2" style="width:13px;height:13px;"></i> Eliminar
        </button>
      </div>

      <div class="staff-user-details-grid">
        <div class="staff-detail-item">
          <span class="staff-detail-label">Correo Registrado</span>
          <span class="staff-detail-value">${maskedMail}</span>
        </div>

        <div class="staff-detail-item">
          <span class="staff-detail-label">Contraseña</span>
          <div class="staff-password-box">
            <span class="staff-password-text">${passDisplay}</span>
            ${isRevealed ? `
              <button type="button" class="btn-copy-pass" data-pass="${user.password || ''}" title="Copiar al portapapeles">
                <i data-lucide="copy" style="width:12px;height:12px;"></i> Copiar
              </button>
              <button type="button" class="btn-toggle-eye btn-hide-pass" data-id="${user.id}" title="Ocultar clave">
                <i data-lucide="eye-off" style="width:12px;height:12px;"></i> Ocultar
              </button>
            ` : `
              <button type="button" class="btn-toggle-eye btn-reveal-pass" data-id="${user.id}" title="Revelar clave">
                <i data-lucide="eye" style="width:12px;height:12px;"></i> Revelar
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    // Botón Ojo (Revelar)
    card.querySelector('.btn-reveal-pass')?.addEventListener('click', () => {
      openRevealPasswordModal(user.id);
    });

    // Botón Ojo (Ocultar)
    card.querySelector('.btn-hide-pass')?.addEventListener('click', () => {
      revealedStaffPasswords.delete(user.id);
      renderUsersList();
    });

    // Botón Copiar
    card.querySelector('.btn-copy-pass')?.addEventListener('click', (e) => {
      const pass = e.currentTarget.dataset.pass;
      if (pass) {
        navigator.clipboard.writeText(pass).then(() => {
          showToast('📋 Contraseña copiada al portapapeles');
        });
      }
    });

    // Botón Eliminar
    card.querySelector('.btn-delete-user')?.addEventListener('click', () => {
      if (confirm(`¿Está seguro de revocar el acceso a "${user.name}"?`)) {
        const filtered = getStaffUsers().filter(u => u.id !== user.id);
        saveStaffUsers(filtered);
        revealedStaffPasswords.delete(user.id);
        showToast(`Acceso de "${user.name}" eliminado`);
        renderUsersList();
      }
    });

    container.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}
