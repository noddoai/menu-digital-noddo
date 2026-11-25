/**
 * Subpestaña de Configuración: Generales
 * HTML asociado: /admin/tabs/settings/general/general-subtab.html
 */

import { db } from '../../../../shared/db.js';

let generalContext = {
  getProfileId: () => 'restaurant',
  showToast: () => {},
  onSaved: () => {}
};

export function updateConfigLogoPreview(url) {
  const img = document.getElementById('configLogoPreviewImg');
  const fallback = document.getElementById('configLogoFallback');
  const btnRemove = document.getElementById('btnRemoveConfigLogo');
  if (url) {
    if (img) {
      img.src = url;
      img.style.display = 'block';
    }
    if (fallback) fallback.style.display = 'none';
    if (btnRemove) btnRemove.style.display = 'inline-flex';
  } else {
    if (img) {
      img.src = '';
      img.style.display = 'none';
    }
    if (fallback) fallback.style.display = 'block';
    if (btnRemove) btnRemove.style.display = 'none';
  }
}

export function loadGeneralSubtab(config) {
  const brandName = document.getElementById('inputBrandName');
  const brandLogoUrl = document.getElementById('inputBrandLogoUrl');
  const brandTagline = document.getElementById('inputBrandTagline');
  const menuIsActive = document.getElementById('inputMenuIsActive');

  if (brandName) brandName.value = config.name || '';
  if (brandLogoUrl) {
    brandLogoUrl.value = config.logoUrl || '';
    updateConfigLogoPreview(config.logoUrl || '');
  }
  if (brandTagline) brandTagline.value = config.tagline || '';
  if (menuIsActive) menuIsActive.checked = config.menuIsActive !== false;
}

export function initGeneralSubtab(context = {}) {
  generalContext = { ...generalContext, ...context };

  const form = document.getElementById('generalConfigForm');
  if (!form) return;

  const logoInput = document.getElementById('inputLogoFile');
  const logoHidden = document.getElementById('inputBrandLogoUrl');
  const btnRemoveLogo = document.getElementById('btnRemoveConfigLogo');

  logoInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (logoHidden) logoHidden.value = evt.target.result;
      updateConfigLogoPreview(evt.target.result);
    };
    reader.readAsDataURL(file);
  });

  btnRemoveLogo?.addEventListener('click', () => {
    if (logoHidden) logoHidden.value = '';
    if (logoInput) logoInput.value = '';
    updateConfigLogoPreview('');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const profileId = generalContext.getProfileId();
    const name = document.getElementById('inputBrandName').value.trim();
    const tagline = document.getElementById('inputBrandTagline').value.trim();
    const menuIsActive = document.getElementById('inputMenuIsActive').checked;
    const logoUrl = document.getElementById('inputBrandLogoUrl')?.value.trim() || '';

    const currentConfig = db.getThemeConfig(profileId);
    db.saveThemeConfig(profileId, {
      ...currentConfig,
      name,
      tagline,
      logoUrl,
      menuIsActive
    });

    generalContext.showToast('Datos generales del comercio guardados exitosamente');
    generalContext.onSaved();
  });
}
