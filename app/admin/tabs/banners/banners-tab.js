/**
 * Módulo de Pestaña: Banners Promocionales & Cropper
 * HTML asociado: /admin/tabs/banners/banners-tab.html
 */

import { db } from '../../../shared/db.js';
import { resolveAssetUrl } from '../../../shared/utils/asset-url.js';

let bannersContext = {
  getProfileId: () => 'restaurant',
  showToast: () => {},
  onBannersUpdated: () => {}
};

let currentCropImage = null;

export function renderBannersTab() {
  const container = document.getElementById('activeBannersList');
  if (!container) return;

  const profileId = bannersContext.getProfileId();
  const banners = db.getPromoBanners(profileId);
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
        <img src="${resolveAssetUrl(banner.image)}" alt="Banner promocional">
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
      db.savePromoBanners(profileId, banners);
      bannersContext.showToast(e.target.checked ? 'Banner activado en la carta' : 'Banner desactivado');
      renderBannersTab();
      bannersContext.onBannersUpdated();
    });

    card.querySelector('.btn-delete-banner').addEventListener('click', () => {
      if (confirm('¿Eliminar este banner promocional?')) {
        const updated = banners.filter((b) => b.id !== banner.id);
        db.savePromoBanners(profileId, updated);
        bannersContext.showToast('Banner eliminado');
        renderBannersTab();
        bannersContext.onBannersUpdated();
      }
    });

    container.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

export function initBannersTab(context = {}) {
  bannersContext = { ...bannersContext, ...context };

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
  const overlayToggle = document.getElementById('bannerShowTextOverlay');
  const overlayFields = document.getElementById('bannerTextOverlayFields');

  if (overlayToggle && overlayFields) {
    overlayToggle.addEventListener('change', (e) => {
      overlayFields.style.display = e.target.checked ? 'flex' : 'none';
    });
  }

  function openCropModal() {
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.style.transform = 'translate(-50%, -50%) scale(1)';
    backdrop.classList.add('active');
    if (fileInput) fileInput.value = '';
    if (cropArea) cropArea.style.display = 'none';
    if (overlayToggle) overlayToggle.checked = false;
    if (overlayFields) overlayFields.style.display = 'none';
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

  btnOpenModal?.addEventListener('click', openCropModal);
  btnCloseModal?.addEventListener('click', closeCropModal);
  btnCancelModal?.addEventListener('click', closeCropModal);
  backdrop?.addEventListener('click', closeCropModal);

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

    let drawWidth;
    let drawHeight;
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

  fileInput?.addEventListener('change', (e) => {
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

  sliderOffsetY?.addEventListener('input', (e) => {
    valOffsetY.textContent = `${e.target.value}%`;
    drawCroppedImage();
  });

  sliderZoom?.addEventListener('input', (e) => {
    valZoom.textContent = `${e.target.value}%`;
    drawCroppedImage();
  });

  btnSave?.addEventListener('click', () => {
    if (!currentCropImage || !canvas) return;
    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.88);

    const showTextOverlay = document.getElementById('bannerShowTextOverlay')?.checked || false;
    const badge = document.getElementById('bannerOverlayBadge')?.value.trim() || '';
    const title = document.getElementById('bannerOverlayTitle')?.value.trim() || '';
    const subtitle = document.getElementById('bannerOverlaySubtitle')?.value.trim() || '';

    const profileId = bannersContext.getProfileId();
    const banners = db.getPromoBanners(profileId) || [];
    banners.unshift({
      id: `banner-${Date.now()}`,
      enabled: true,
      showTextOverlay,
      badge,
      title,
      subtitle,
      image: croppedBase64
    });

    db.savePromoBanners(profileId, banners);
    closeCropModal();
    bannersContext.showToast('Nuevo banner promocional guardado y encuadrado');
    renderBannersTab();
    bannersContext.onBannersUpdated();
  });
}
