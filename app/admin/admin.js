/**
 * AURA & MAISON - LÓGICA DEL PANEL DE ADMINISTRACIÓN (admin.js)
 * Soporta Edición Rápida de Precios Inline, Aumento Masivo de Precios (%), Filtros Avanzados para Cartas Grandes, Popup Centrado y Códigos QR.
 */

import { BUSINESS_PROFILES } from '../shared/menuData.js';
import { db } from '../shared/db.js';
import {
  reloadPhonePreview as renderPhonePreview,
  setupPhonePreview
} from './components/phone-preview/phone-preview.js';
import { initCatalogTab, populateCategoryFilter, renderCatalogTab } from './tabs/catalog/catalog-tab.js';
import { initQrTab, renderQrTab } from './tabs/qr/qr-tab.js';
import { initStockTab, renderStockTab } from './tabs/stock/stock-tab.js';
import { initBannersTab, renderBannersTab } from './tabs/banners/banners-tab.js';
import { initSettingsTab, loadSettingsTab } from './tabs/settings/settings-tab.js';

const adminState = {
  isLoggedIn: false,
  currentProfileId: 'restaurant'
};

async function loadHtmlPartial(slotId, url) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo cargar el parcial ${url} (${res.status})`);
  slot.outerHTML = await res.text();
}

async function loadAdminPartials() {
  await Promise.all([
    loadHtmlPartial('catalogTabSlot', '/admin/tabs/catalog/catalog-tab.html'),
    loadHtmlPartial('stockTabSlot', '/admin/tabs/stock/stock-tab.html'),
    loadHtmlPartial('bannersTabSlot', '/admin/tabs/banners/banners-tab.html'),
    loadHtmlPartial('qrTabSlot', '/admin/tabs/qr/qr-tab.html'),
    loadHtmlPartial('settingsTabSlot', '/admin/tabs/settings/settings-tab.html'),
    loadHtmlPartial('phonePreviewSlot', '/admin/components/phone-preview/phone-preview.html')
  ]);

  await Promise.all([
    loadHtmlPartial('settingsGeneralSlot', '/admin/tabs/settings/general/general-subtab.html'),
    loadHtmlPartial('settingsMenuStyleSlot', '/admin/tabs/settings/menu-style/menu-style-subtab.html'),
    loadHtmlPartial('settingsCategoriesSlot', '/admin/tabs/settings/categories/categories-subtab.html'),
    loadHtmlPartial('settingsStaffSlot', '/admin/tabs/settings/staff/staff-subtab.html')
  ]);

  if (window.lucide) window.lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadAdminPartials();
  } catch (err) {
    console.error('Error cargando vistas modulares del panel admin:', err);
  }

  setupLogin();
  setupNavigation();
  initCatalogTab({
    getProfileId: () => adminState.currentProfileId,
    getCurrencySymbol: () => adminState.currencySymbol,
    showToast,
    onCatalogUpdated: () => reloadPhonePreview()
  });
  initBannersTab({
    getProfileId: () => adminState.currentProfileId,
    showToast,
    onBannersUpdated: () => reloadPhonePreview()
  });
  initQrTab({ getProfileId: () => adminState.currentProfileId, showToast });
  initSettingsTab({
    getProfileId: () => adminState.currentProfileId,
    getCurrencySymbol: () => adminState.currencySymbol,
    showToast,
    onThemeUpdated: () => reloadPhonePreview(),
    onCurrencyUpdated: (symbol) => {
      updateGlobalCurrencySymbol(symbol);
      renderItemsTable();
      reloadPhonePreview();
    },
    onCategoriesUpdated: () => {
      populateCategoryFilter();
      reloadPhonePreview();
    }
  });
  initStockTab({
    getProfileId: () => adminState.currentProfileId,
    getCurrencySymbol: () => adminState.currencySymbol,
    showToast,
    onStockToggled: () => {
      renderItemsTable();
      reloadPhonePreview();
    }
  });
  setupUserMenuAndProfile();
});

// ==========================================
// 1. AUTENTICACIÓN & GESTIÓN DE CUENTA
// ==========================================
function setupLogin() {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  // Botones de acceso rápido para pruebas
  document.getElementById('btnQuickDemoBistro')?.addEventListener('click', async () => {
    document.getElementById('loginUser').value = 'admin@gourmetbistro.com';
    document.getElementById('loginPass').value = 'admin123';
    adminState.currentProfileId = 'restaurant';
    sessionStorage.setItem('aura_active_profile', 'restaurant');
    const res = await db.loginApi('admin@gourmetbistro.com', 'admin123');
    if (res.success) {
      adminState.isLoggedIn = true;
      sessionStorage.setItem('aura_admin_logged', 'true');
      sessionStorage.setItem('aura_user_role', 'owner');
      showDashboard();
      showToast('Sesión iniciada como Gourmet Bistro & Grill');
    }
  });

  document.getElementById('btnQuickDemoCafe')?.addEventListener('click', async () => {
    document.getElementById('loginUser').value = 'admin@maisoncafe.com';
    document.getElementById('loginPass').value = 'admin123';
    adminState.currentProfileId = 'bakery_cafe';
    sessionStorage.setItem('aura_active_profile', 'bakery_cafe');
    const res = await db.loginApi('admin@maisoncafe.com', 'admin123');
    if (res.success) {
      adminState.isLoggedIn = true;
      sessionStorage.setItem('aura_admin_logged', 'true');
      sessionStorage.setItem('aura_user_role', 'owner');
      showDashboard();
      showToast('Sesión iniciada como Maison Cafe & Bakery');
    }
  });

  document.getElementById('btnQuickDemoPassport')?.addEventListener('click', async () => {
    document.getElementById('loginUser').value = 'admin@lepassportnice.com';
    document.getElementById('loginPass').value = 'admin123';
    adminState.currentProfileId = 'le-passport-nice';
    const res = await db.loginApi('admin@lepassportnice.com', 'admin123');
    if (res.success) {
      adminState.isLoggedIn = true;
      sessionStorage.setItem('aura_admin_logged', 'true');
      showDashboard();
      showToast("Sesión iniciada como Le Pass'Port Nice");
    }
  });

  if (sessionStorage.getItem('aura_admin_logged') === 'true') {
    adminState.isLoggedIn = true;
    const savedProfile = sessionStorage.getItem('aura_active_profile');
    if (savedProfile) {
      adminState.currentProfileId = savedProfile;
    }
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
      if (res.user?.profileId) {
        adminState.currentProfileId = res.user.profileId;
      }
      sessionStorage.setItem('aura_admin_logged', 'true');
      sessionStorage.setItem('aura_active_profile', adminState.currentProfileId);
      sessionStorage.setItem('aura_user_role', adminState.currentUser.role || 'owner');
      loginError.style.display = 'none';
      showDashboard();
    } else {
      loginError.style.display = 'block';
    }
  });
}

function renderUserTopBar() {
  const user = db.getCurrentUser();
  const userName = user.name || (user.email ? user.email.split('@')[0] : 'Administrador');
  const userEmail = user.email || 'admin@comercio.com';
  const roleName = user.role === 'manager' ? 'Encargado' : (user.role === 'staff' ? 'Staff Barra' : 'Propietario');
  const initial = (userName.trim()[0] || 'A').toUpperCase();

  const elAvatar = document.getElementById('topbarUserAvatar');
  const elName = document.getElementById('topbarUserName');
  const elRole = document.getElementById('topbarUserRole');
  const elDropAvatar = document.getElementById('dropdownUserAvatar');
  const elDropName = document.getElementById('dropdownUserName');
  const elDropEmail = document.getElementById('dropdownUserEmail');
  const elModalAvatar = document.getElementById('modalUserAvatarPreview');

  if (elAvatar) elAvatar.textContent = initial;
  if (elName) elName.textContent = userName;
  if (elRole) elRole.textContent = roleName;
  if (elDropAvatar) elDropAvatar.textContent = initial;
  if (elDropName) elDropName.textContent = userName;
  if (elDropEmail) elDropEmail.textContent = userEmail;
  if (elModalAvatar) elModalAvatar.textContent = initial;
}

function setupUserMenuAndProfile() {
  const toggleBtn = document.getElementById('btnUserMenuToggle');
  const dropdown = document.getElementById('userDropdownMenu');
  const wrapper = document.getElementById('userMenuWrapper');

  if (toggleBtn && dropdown) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
      toggleBtn.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
    });

    // Cerrar al hacer clic fuera del dropdown
    document.addEventListener('click', (e) => {
      if (wrapper && !wrapper.contains(e.target)) {
        dropdown.style.display = 'none';
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        toggleBtn.setAttribute('aria-expanded', 'false');
        closeUserProfileModal();
      }
    });
  }

  // Opción "Configuración del Local"
  document.getElementById('btnGoToStoreConfig')?.addEventListener('click', () => {
    if (dropdown) dropdown.style.display = 'none';
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    
    // Activar pestaña de Configuración
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    const tabStylesBtn = document.getElementById('navTabStyles');
    const tabStylesContent = document.getElementById('tabStyles');
    if (tabStylesBtn) tabStylesBtn.classList.add('active');
    if (tabStylesContent) tabStylesContent.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
  });

  // Opción "Cerrar Sesión"
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    if (dropdown) dropdown.style.display = 'none';
    db.logoutApi();
    adminState.isLoggedIn = false;
    document.getElementById('adminDashboardSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'flex';
    showToast('Sesión cerrada correctamente');
  });

  // Modal de Mi Perfil & Contraseña
  const openModalBtn = document.getElementById('btnOpenUserProfileModal');
  const modal = document.getElementById('userProfileModal');
  const backdrop = document.getElementById('userProfileModalBackdrop');
  const closeBtn = document.getElementById('btnCloseUserProfileModal');
  const cancelBtn = document.getElementById('btnCancelUserProfileModal');
  const form = document.getElementById('userProfileForm');
  const errorDiv = document.getElementById('userProfileError');

  function openUserProfileModal() {
    if (dropdown) dropdown.style.display = 'none';
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');

    const user = db.getCurrentUser();
    const nameInput = document.getElementById('inputUserProfileName');
    const emailInput = document.getElementById('inputUserProfileEmail');
    const passInput = document.getElementById('inputUserNewPassword');
    const confirmInput = document.getElementById('inputUserConfirmPassword');

    if (nameInput) nameInput.value = user.name || 'Administrador Principal';
    if (emailInput) emailInput.value = user.email || 'admin@gourmetbistro.com';
    if (passInput) passInput.value = '';
    if (confirmInput) confirmInput.value = '';
    if (errorDiv) errorDiv.style.display = 'none';

    if (modal) modal.style.display = 'block';
    if (backdrop) backdrop.style.display = 'block';
    renderUserTopBar();
    if (window.lucide) window.lucide.createIcons();
  }

  function closeUserProfileModal() {
    if (modal) modal.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';
  }

  openModalBtn?.addEventListener('click', openUserProfileModal);
  closeBtn?.addEventListener('click', closeUserProfileModal);
  cancelBtn?.addEventListener('click', closeUserProfileModal);
  backdrop?.addEventListener('click', closeUserProfileModal);

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('inputUserProfileName').value.trim();
    const email = document.getElementById('inputUserProfileEmail').value.trim();
    const newPass = document.getElementById('inputUserNewPassword').value.trim();
    const confirmPass = document.getElementById('inputUserConfirmPassword').value.trim();

    if (!name || !email) {
      if (errorDiv) {
        errorDiv.textContent = 'El nombre y correo electrónico son obligatorios.';
        errorDiv.style.display = 'block';
      }
      return;
    }

    if (newPass) {
      if (newPass.length < 6) {
        if (errorDiv) {
          errorDiv.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
          errorDiv.style.display = 'block';
        }
        return;
      }
      if (newPass !== confirmPass) {
        if (errorDiv) {
          errorDiv.textContent = 'Las contraseñas no coinciden.';
          errorDiv.style.display = 'block';
        }
        return;
      }
    }

    const updates = { name, email };
    if (newPass) {
      updates.password = newPass;
    }

    db.updateCurrentUser(updates);
    renderUserTopBar();
    closeUserProfileModal();
    showToast('✅ Perfil de usuario actualizado con éxito');
  });
}

function updateProfileUI() {
  document.documentElement.dataset.theme = adminState.currentProfileId;
  const isBistro = adminState.currentProfileId === 'restaurant';

  const profileSelect = document.getElementById('adminProfileSelect');
  if (profileSelect && profileSelect.value !== adminState.currentProfileId) {
    profileSelect.value = adminState.currentProfileId;
  }

  const brandTitle = document.getElementById('adminBrandTitle');
  if (brandTitle) {
    brandTitle.textContent = isBistro ? 'Gourmet Bistro & Grill' : 'Maison Cafe & Bakery';
  }

  const iframe = document.getElementById('phonePreviewIframe');
  if (iframe) {
    const targetSrc = isBistro ? '/restaurant.html' : '/cafe.html';
    if (!iframe.src.endsWith(targetSrc)) {
      iframe.src = targetSrc;
    }
  }
}

function showDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('adminDashboardSection').style.display = 'block';

  const userRole = sessionStorage.getItem('aura_user_role') || 'owner';
  applyRolePermissions(userRole);
  updateProfileUI();
  renderUserTopBar();

  const profileSelect = document.getElementById('adminProfileSelect');
  if (profileSelect && adminState.currentProfileId) {
    profileSelect.value = adminState.currentProfileId;
  }

  const themeConfig = db.getThemeConfig(adminState.currentProfileId);
  adminState.currencySymbol = themeConfig.currencySymbol || (adminState.currentProfileId === 'le-passport-nice' ? '€' : '$');
  updateGlobalCurrencySymbol(adminState.currencySymbol);

  const brandTitleEl = document.getElementById('adminBrandTitle');
  if (brandTitleEl) brandTitleEl.textContent = themeConfig.name || "Le Pass'Port Nice";

  const slugEl = document.getElementById('kpiSlugName');
  if (slugEl) slugEl.textContent = adminState.currentProfileId;

  reloadPhonePreview();

  populateCategoryFilter();
  renderItemsTable();
  renderQuickStockGrid();
  renderBannersList();
  renderQrCode();
  loadSettingsTab();
  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// 2. NAVEGACIÓN Y PESTAÑAS
// ==========================================
function reloadPhonePreview() {
  renderPhonePreview(adminState.currentProfileId);
}

function setupNavigation() {
  setupPhonePreview({
    getProfileId: () => adminState.currentProfileId,
    onReload: () => showToast('Vista previa en tiempo real actualizada')
  });

  const profileSelect = document.getElementById('adminProfileSelect');
  profileSelect?.addEventListener('change', (e) => {
    adminState.currentProfileId = e.target.value;
    sessionStorage.setItem('aura_active_profile', adminState.currentProfileId);

    reloadPhonePreview();

    const themeConfig = db.getThemeConfig(adminState.currentProfileId);
    adminState.currencySymbol = themeConfig.currencySymbol || (adminState.currentProfileId === 'le-passport-nice' ? '€' : '$');
    updateGlobalCurrencySymbol(adminState.currencySymbol);

    const brandTitleEl = document.getElementById('adminBrandTitle');
    if (brandTitleEl) brandTitleEl.textContent = themeConfig.name || e.target.options[e.target.selectedIndex].text;

    const slugEl = document.getElementById('kpiSlugName');
    if (slugEl) slugEl.textContent = adminState.currentProfileId;
    populateCategoryFilter();
    renderItemsTable();
    renderQuickStockGrid();
    renderBannersList();
    renderQrCode();
    loadSettingsTab();
    showToast(`Comercio activo: ${e.target.options[e.target.selectedIndex].text}`);
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
}

function renderItemsTable() {
  renderCatalogTab();
}

// ==========================================
// 7. BANNERS PROMOCIONALES & CÓDIGO QR
// ==========================================
function renderBannersList() {
  renderBannersTab();
}

function renderQrCode() {
  renderQrTab(adminState.currentProfileId);
}

function updateGlobalCurrencySymbol(symbol) {
  adminState.currencySymbol = symbol || '$';
  document.querySelectorAll('.price-symbol, .currency-symbol-label, .currency-symbol-inline, .inline-price-symbol').forEach(el => {
    el.textContent = adminState.currencySymbol;
  });
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
function renderQuickStockGrid(query = '') {
  renderStockTab(query);
}
