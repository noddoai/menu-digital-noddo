/**
 * Módulo de Pestaña: Configuración (orquestador de subpestañas)
 * HTML asociado: /admin/tabs/settings/settings-tab.html
 */

import { db } from '../../../shared/db.js';
import { initGeneralSubtab, loadGeneralSubtab } from './general/general-subtab.js';
import { initMenuStyleSubtab, loadMenuStyleSubtab } from './menu-style/menu-style-subtab.js';
import { initCategoriesSubtab, renderCategoriesSubtab } from './categories/categories-subtab.js';
import { initStaffSubtab, renderStaffSubtab } from './staff/staff-subtab.js';

let settingsContext = {
  getProfileId: () => 'restaurant',
  getCurrencySymbol: () => '$',
  showToast: () => {},
  onThemeUpdated: () => {},
  onCurrencyUpdated: () => {},
  onCategoriesUpdated: () => {}
};

export function loadSettingsTab() {
  const profileId = settingsContext.getProfileId();
  const config = db.getThemeConfig(profileId);

  loadGeneralSubtab(config);
  loadMenuStyleSubtab(config, profileId);
  renderCategoriesSubtab();
  renderStaffSubtab();
}

export function initSettingsTab(context = {}) {
  settingsContext = { ...settingsContext, ...context };

  document.querySelectorAll('.config-subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.config-subtab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.config-subtab-content').forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const subtabId = btn.dataset.subtab;
      const targetContent = document.getElementById(subtabId);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
      }

      document.querySelectorAll('.config-subtab-content').forEach((c) => {
        if (c.id !== subtabId) c.style.display = 'none';
      });

      if (window.lucide) window.lucide.createIcons();
    });
  });

  initGeneralSubtab({
    getProfileId: settingsContext.getProfileId,
    showToast: settingsContext.showToast,
    onSaved: () => settingsContext.onThemeUpdated()
  });

  initMenuStyleSubtab({
    getProfileId: settingsContext.getProfileId,
    showToast: settingsContext.showToast,
    onSaved: (symbol) => settingsContext.onCurrencyUpdated(symbol)
  });

  initCategoriesSubtab({
    getProfileId: settingsContext.getProfileId,
    showToast: settingsContext.showToast,
    onCategoriesUpdated: () => settingsContext.onCategoriesUpdated()
  });

  initStaffSubtab({
    showToast: settingsContext.showToast
  });
}
