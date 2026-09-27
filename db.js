/**
 * Módulo de Base de Datos y API Client SDK (db.js)
 * Proporciona una interfaz unificada para el Panel de Control Admin y los Menús Digitales.
 * Soporta sincronización remota con Backend REST API (/api/v1) y fallback offline transparente en LocalStorage.
 */

import { BUSINESS_PROFILES, MENU_ITEMS } from './menuData.js';

const STORAGE_KEY_ITEMS = 'aura_menu_items_v6';
const STORAGE_KEY_THEMES = 'aura_menu_themes_v6';
const STORAGE_KEY_BANNERS = 'aura_menu_banners_v7';
const STORAGE_KEY_AUTH_TOKEN = 'aura_auth_token_v1';
const STORAGE_KEY_AUTH_USER = 'aura_auth_user_v1';

const API_BASE_URL = window.LOCATION_API_URL || 'http://localhost:3000/api/v1';

export const db = {
  apiAvailable: null,

  async checkApiStatus() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      this.apiAvailable = res.ok;
    } catch {
      this.apiAvailable = false;
    }
    return this.apiAvailable;
  },

  getAuthHeaders() {
    const token = localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  // ==========================================
  // 1. MÉTODOS DE PLATOS E ÍTEMS
  // ==========================================

  getAllItems() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error leyendo LocalStorage:', e);
    }
    this.saveAllItems(MENU_ITEMS);
    return MENU_ITEMS;
  },

  getItemsByProfile(profileId) {
    const all = this.getAllItems();
    return all.filter(item => item.businessProfile === profileId);
  },

  getFeaturedItems(profileId) {
    const items = this.getItemsByProfile(profileId);
    return items.filter(item => item.isFeatured === true);
  },

  saveAllItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Error guardando en LocalStorage:', e);
    }
  },

  getItemById(id) {
    const all = this.getAllItems();
    return all.find(item => item.id === id) || null;
  },

  saveItem(itemData) {
    const all = this.getAllItems();
    const index = all.findIndex(item => item.id === itemData.id);

    if (index >= 0) {
      all[index] = { ...all[index], ...itemData };
    } else {
      if (!itemData.id) {
        itemData.id = `${itemData.businessProfile || 'item'}-${Date.now()}`;
      }
      all.unshift(itemData);
    }

    this.saveAllItems(all);
    this.syncItemToApi(itemData).catch(err => console.log('Modo offline:', err.message));
    return itemData;
  },

  toggleAvailability(id) {
    const all = this.getAllItems();
    const item = all.find(i => i.id === id);
    if (item) {
      item.isAvailable = !item.isAvailable;
      this.saveAllItems(all);
      this.syncPatchToApi(`/admin/items/${id}/toggle-stock`, { isAvailable: item.isAvailable });
      return item.isAvailable;
    }
    return false;
  },

  toggleFeatured(id) {
    const all = this.getAllItems();
    const item = all.find(i => i.id === id);
    if (item) {
      item.isFeatured = !item.isFeatured;
      this.saveAllItems(all);
      this.syncPatchToApi(`/admin/items/${id}/toggle-featured`, { isFeatured: item.isFeatured });
      return item.isFeatured;
    }
    return false;
  },

  deleteItem(id) {
    let all = this.getAllItems();
    all = all.filter(i => i.id !== id);
    this.saveAllItems(all);
    this.syncDeleteToApi(`/admin/items/${id}`);
  },

  // ==========================================
  // 2. CONFIGURACIÓN DE TEMA Y MARCA
  // ==========================================

  getThemeConfig(profileId) {
    try {
      const data = localStorage.getItem(STORAGE_KEY_THEMES);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed[profileId]) return parsed[profileId];
      }
    } catch (e) {
      console.error('Error leyendo tema:', e);
    }

    const defaultProfile = profileId === 'restaurant' ? BUSINESS_PROFILES.RESTAURANT : BUSINESS_PROFILES.BAKERY_CAFE;
    return {
      name: defaultProfile.name,
      tagline: defaultProfile.tagline,
      heroBadge: defaultProfile.heroBadge,
      accentColor: profileId === 'restaurant' ? '#207567' : '#7c4a27',
      themeMode: profileId === 'restaurant' ? 'dark' : 'light',
      showPrepTime: true,
      menuIsActive: true
    };
  },

  saveThemeConfig(profileId, config) {
    try {
      const data = localStorage.getItem(STORAGE_KEY_THEMES);
      const parsed = data ? JSON.parse(data) : {};
      parsed[profileId] = { ...parsed[profileId], ...config };
      localStorage.setItem(STORAGE_KEY_THEMES, JSON.stringify(parsed));
      this.syncPatchToApi(`/admin/theme`, { profileId, ...config });
    } catch (e) {
      console.error('Error guardando configuración de tema:', e);
    }
  },

  // ==========================================
  // 2B. GESTIÓN DE CATEGORÍAS PERSONALIZADAS
  // ==========================================
  getCategories(profileId) {
    const key = `aura_categories_${profileId}`;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error leyendo categorías:', e);
    }

    const defaultProfile = profileId === 'restaurant' ? BUSINESS_PROFILES.RESTAURANT : BUSINESS_PROFILES.BAKERY_CAFE;
    return defaultProfile.categories || [
      { id: "all", name: "Todas las Opciones", icon: "sparkles" },
      { id: "entradas", name: "Entradas & Ensaladas", icon: "salad" },
      { id: "principales", name: "Platos Principales", icon: "flame" },
      { id: "cocteleria", name: "Coctelería & Vinos", icon: "glass-water" },
      { id: "postres", name: "Postres del Día", icon: "cake" }
    ];
  },

  saveCategories(profileId, categories) {
    const key = `aura_categories_${profileId}`;
    try {
      localStorage.setItem(key, JSON.stringify(categories));
      this.syncPatchToApi(`/admin/categories`, { profileId, categories });
    } catch (e) {
      console.error('Error guardando categorías:', e);
    }
  },

  addCategory(profileId, name) {
    if (!name || !name.trim()) return false;
    const categories = this.getCategories(profileId);
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const newCat = { id, name: name.trim(), icon: 'utensils' };
    categories.push(newCat);
    this.saveCategories(profileId, categories);
    return newCat;
  },

  deleteCategory(profileId, categoryId) {
    if (categoryId === 'all') return false;
    let categories = this.getCategories(profileId);
    categories = categories.filter(c => c.id !== categoryId);
    this.saveCategories(profileId, categories);
    return true;
  },

  // ==========================================
  // 3. BANNERS PROMOCIONALES (CARRUSEL)
  // ==========================================

  getPromoBanners(profileId) {
    try {
      const data = localStorage.getItem(STORAGE_KEY_BANNERS);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed[profileId] && Array.isArray(parsed[profileId])) {
          return parsed[profileId];
        }
      }
    } catch (e) {
      console.error('Error leyendo banners promocionales:', e);
    }

    const defaultProfile = profileId === 'restaurant' ? BUSINESS_PROFILES.RESTAURANT : BUSINESS_PROFILES.BAKERY_CAFE;
    const defaultBanners = defaultProfile.promoBanners || [];
    this.savePromoBanners(profileId, defaultBanners);
    return defaultBanners;
  },

  getPromoBanner(profileId) {
    const banners = this.getPromoBanners(profileId);
    return banners.find(b => b.enabled) || banners[0] || null;
  },

  savePromoBanners(profileId, banners) {
    try {
      const data = localStorage.getItem(STORAGE_KEY_BANNERS);
      const parsed = data ? JSON.parse(data) : {};
      parsed[profileId] = banners;
      localStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(parsed));
      this.syncPatchToApi(`/admin/promotions`, { profileId, banners });
    } catch (e) {
      console.error('Error guardando carrusel de banners:', e);
    }
  },

  saveSinglePromoBanner(profileId, bannerData) {
    let banners = this.getPromoBanners(profileId);
    const index = banners.findIndex(b => b.id === bannerData.id);
    if (index >= 0) {
      banners[index] = { ...banners[index], ...bannerData };
    } else {
      bannerData.id = bannerData.id || `banner-${Date.now()}`;
      banners.unshift(bannerData);
    }
    this.savePromoBanners(profileId, banners);
    return bannerData;
  },

  deletePromoBanner(profileId, bannerId) {
    let banners = this.getPromoBanners(profileId);
    banners = banners.filter(b => b.id !== bannerId);
    this.savePromoBanners(profileId, banners);
  },

  // ==========================================
  // 4. AUTENTICACIÓN Y SERVICIOS API
  // ==========================================

  async loginApi(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // 1. Dueño principal Bistro (o cualquier variación con admin)
    if (!cleanEmail || cleanEmail === 'admin' || cleanEmail === 'admin@gourmetbistro.com' || cleanEmail.includes('bistro')) {
      const mockUser = { id: 'user-admin-bistro', email: 'admin@gourmetbistro.com', role: 'owner', profileId: 'restaurant' };
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    }

    // 2. Dueño Maison Cafe
    if (cleanEmail === 'admin@maisoncafe.com' || cleanEmail.includes('cafe')) {
      const mockUser = { id: 'user-admin-cafe', email: 'admin@maisoncafe.com', role: 'owner', profileId: 'bakery_cafe' };
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    }

    // 3. Personal registrado en LocalStorage
    try {
      const staffUsers = JSON.parse(localStorage.getItem('aura_staff_users_v1') || '[]');
      const foundStaff = staffUsers.find(u => u.email.toLowerCase() === cleanEmail && (u.password === cleanPass || !cleanPass));
      if (foundStaff) {
        const staffUser = { id: foundStaff.id, name: foundStaff.name, email: foundStaff.email, role: foundStaff.role || 'staff' };
        localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(staffUser));
        return { success: true, user: staffUser };
      }
    } catch (e) {
      console.error('Error verificando credenciales staff:', e);
    }

    // 4. Intento genérico de Dueño
    const genericOwner = { id: `owner-${Date.now()}`, email: cleanEmail, role: 'owner', profileId: 'restaurant' };
    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(genericOwner));
    return { success: true, user: genericOwner };
  },

  logoutApi() {
    localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    sessionStorage.removeItem('aura_admin_logged');
  },

  async syncItemToApi(itemData) {
    return fetch(`${API_BASE_URL}/admin/items`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(itemData)
    }).catch(() => {});
  },

  async syncPatchToApi(path, payload) {
    return fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload)
    }).catch(() => {});
  },

  async syncDeleteToApi(path) {
    return fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    }).catch(() => {});
  },

  resetToDefaults() {
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_THEMES);
    localStorage.removeItem(STORAGE_KEY_BANNERS);
    this.saveAllItems(MENU_ITEMS);
    this.getPromoBanners('restaurant');
    this.getPromoBanners('bakery_cafe');
  }
};
