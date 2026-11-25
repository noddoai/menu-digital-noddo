/**
 * Componente Bottom Sheet de Detalle del Plato & Visor WebAR
 */

import { db } from '../../shared/db.js';
import { formatPrice } from '../../shared/utils/formatters.js';
import { dishHasMedia, getDishImageUrl } from './dish-media.js';

export function openWebARViewer(modelUrl, title) {
  const arOverlay = document.createElement('div');
  arOverlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 350;
    display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;
  `;

  arOverlay.innerHTML = `
    <button class="btn-close-sheet" style="top:20px;right:20px;" id="btnCloseAR"><i data-lucide="x"></i></button>
    <h3 style="color:#fff;margin-bottom:16px;font-family:var(--font-heading);">${title} (Vista 3D AR)</h3>
    <model-viewer src="${modelUrl}" ar ar-modes="webxr scene-viewer quick-look" camera-controls touch-action="pan-y" alt="Modelo 3D del plato" style="width: 100%; height: 70vh; border-radius: 16px; background: #16161a;">
    </model-viewer>
    <p style="color:#a0a0ab;font-size:0.8rem;margin-top:12px;">En dispositivos iOS / Android compatibles, presione el icono 3D para proyectar en su mesa.</p>
  `;

  document.body.appendChild(arOverlay);
  if (window.lucide) window.lucide.createIcons();

  document.getElementById('btnCloseAR')?.addEventListener('click', () => arOverlay.remove());
}

export function closeDishModal() {
  const backdrop = document.getElementById('dishModalBackdrop');
  const sheet = document.getElementById('dishModalSheet');
  if (backdrop) {
    backdrop.style.opacity = '';
    backdrop.classList.remove('open');
  }
  if (sheet) {
    sheet.style.transition = '';
    sheet.style.transform = '';
    sheet.classList.remove('open');
  }
}

export function setupSheetSwipeToClose() {
  const sheet = document.getElementById('dishModalSheet');
  const backdrop = document.getElementById('dishModalBackdrop');
  if (!sheet) return;

  let startY = 0;
  let currentDeltaY = 0;
  let isDragging = false;

  const startDrag = (clientY) => {
    if (!sheet.classList.contains('open')) return;
    if (sheet.scrollTop > 0) return;
    startY = clientY;
    currentDeltaY = 0;
    isDragging = true;
    sheet.style.transition = 'none';
  };

  const moveDrag = (clientY, event) => {
    if (!isDragging) return;
    const deltaY = clientY - startY;
    if (deltaY > 0 && sheet.scrollTop <= 0) {
      currentDeltaY = deltaY;
      if (event && event.cancelable) event.preventDefault();
      sheet.style.transform = `translateX(-50%) translateY(${deltaY}px)`;
      if (backdrop) {
        backdrop.style.opacity = String(Math.max(0, 1 - deltaY / 320));
      }
    } else if (deltaY < 0) {
      currentDeltaY = 0;
      sheet.style.transform = 'translateX(-50%) translateY(0px)';
    }
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = '';

    if (currentDeltaY > 85) {
      closeDishModal();
    } else {
      sheet.style.transform = '';
      if (backdrop) backdrop.style.opacity = '';
    }
    currentDeltaY = 0;
  };

  sheet.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 1) startDrag(e.touches[0].clientY);
    },
    { passive: true }
  );

  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length === 1) moveDrag(e.touches[0].clientY, e);
    },
    { passive: false }
  );

  sheet.addEventListener('touchend', endDrag);
  sheet.addEventListener('touchcancel', endDrag);

  sheet.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, a, input, select')) return;
    startDrag(e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) moveDrag(e.clientY, e);
  });

  window.addEventListener('mouseup', endDrag);
}

export function openDishModal(dish, { currencySymbol }) {
  const hasMultipleSizes = dish.hasVariations && Array.isArray(dish.variations) && dish.variations.length > 0;

  document.getElementById('modalDishTitle').textContent = dish.name;

  const modalPriceEl = document.getElementById('modalDishPrice');
  if (modalPriceEl) {
    if (hasMultipleSizes) {
      const prices = dish.variations.map((v) => Number(v.price) || 0);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      modalPriceEl.textContent =
        minP !== maxP ? `${formatPrice(minP, currencySymbol)} – ${formatPrice(maxP, currencySymbol)}` : formatPrice(minP, currencySymbol);
    } else {
      modalPriceEl.textContent = formatPrice(dish.price, currencySymbol);
    }
  }

  document.getElementById('modalDishStory').textContent = dish.fullStory || dish.shortDescription || '';

  const modalVariationsContainer = document.getElementById('modalVariationsContainer');
  if (modalVariationsContainer) {
    if (hasMultipleSizes) {
      modalVariationsContainer.style.display = 'block';
      modalVariationsContainer.innerHTML = `
        <div class="modal-portions-section">
          <div class="modal-portions-header">
            <div class="modal-portions-title-box">
              <i data-lucide="scale" style="width:16px;height:16px;color:var(--accent-text-display, var(--accent-gold));"></i>
              <span class="modal-portions-title">Opciones de Tamaño & Precio</span>
            </div>
          </div>

          <div class="portions-list-stack">
            ${dish.variations
              .map(
                (v) => `
              <div class="portion-info-card">
                <div class="portion-info-main">
                  <span class="portion-title">${v.name}</span>
                  ${v.description || v.desc ? `<span class="portion-desc">${v.description || v.desc}</span>` : ''}
                </div>
                <div class="portion-price-badge">
                  ${formatPrice(v.price, currencySymbol)}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    } else {
      modalVariationsContainer.style.display = 'none';
      modalVariationsContainer.innerHTML = '';
    }
  }

  const sheet = document.getElementById('dishModalSheet');
  const mediaContainer = document.getElementById('modalHeroMediaContainer');
  const hasMedia = dishHasMedia(dish);

  if (hasMedia) {
    if (sheet) sheet.classList.remove('no-hero-media');
    if (mediaContainer) {
      mediaContainer.style.display = 'block';
      mediaContainer.innerHTML = '';
      if (dish.media?.videoLoopUrl) {
        const video = document.createElement('video');
        video.src = dish.media.videoLoopUrl;
        video.poster = getDishImageUrl(dish);
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        mediaContainer.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = getDishImageUrl(dish);
        img.alt = dish.name;
        mediaContainer.appendChild(img);
      }
    }
  } else {
    if (sheet) sheet.classList.add('no-hero-media');
    if (mediaContainer) {
      mediaContainer.style.display = 'none';
      mediaContainer.innerHTML = '';
    }
  }

  const badgesContainer = document.getElementById('modalDietaryBadges');
  badgesContainer.innerHTML = '';
  if (dish.dietaryFlags?.isGlutenFree) badgesContainer.innerHTML += '<span class="tag-diet">🌾 Sin TACC</span>';
  if (dish.dietaryFlags?.isVegan) badgesContainer.innerHTML += '<span class="tag-diet">🌱 Vegano</span>';
  if (dish.dietaryFlags?.isVegetarian) badgesContainer.innerHTML += '<span class="tag-diet">🥦 Vegetariano</span>';
  if (dish.dietaryFlags && !dish.dietaryFlags.containsDairy) badgesContainer.innerHTML += '<span class="tag-diet">🧀 Sin Lactosa</span>';
  if (dish.dietaryFlags && !dish.dietaryFlags.containsNuts) badgesContainer.innerHTML += '<span class="tag-diet">🥜 Sin Frutos Secos</span>';

  const arContainer = document.getElementById('arButtonContainer');
  arContainer.innerHTML = '';
  if (dish.media?.model3dUrl) {
    const arBtn = document.createElement('button');
    arBtn.className = 'btn-ar-launch';
    arBtn.innerHTML = '<i data-lucide="box"></i> Ver Plato en Realidad Aumentada 3D';
    arBtn.addEventListener('click', () => openWebARViewer(dish.media.model3dUrl, dish.name));
    arContainer.appendChild(arBtn);
  }

  const layersContainer = document.getElementById('modalLayersList');
  const layersSectionTitle = layersContainer?.previousElementSibling;
  layersContainer.innerHTML = '';

  const comboInfo = db.resolveCombo(dish);

  if (comboInfo) {
    if (layersSectionTitle) layersSectionTitle.textContent = 'Productos Incluidos en el Combo';
    const savingsBanner =
      comboInfo.savingsAmount > 0
        ? `
      <div class="modal-combo-savings-card">
        <div>
          <span class="modal-combo-savings-label">Por separado: <s>${formatPrice(comboInfo.regularTotal, currencySymbol)}</s></span>
          <strong class="modal-combo-savings-highlight">Ahorrás ${formatPrice(comboInfo.savingsAmount, currencySymbol)} (${comboInfo.savingsPercent}% OFF)</strong>
        </div>
        <span class="badge badge-combo">COMBO</span>
      </div>
    `
        : '';

    layersContainer.innerHTML = `
      ${savingsBanner}
      <div class="modal-combo-items-list">
        ${comboInfo.items
          .map(
            (ci) => `
          <div class="modal-combo-item-row ${ci.isAvailable ? '' : 'is-out'}">
            <div class="modal-combo-item-left">
              <span class="modal-combo-qty">${ci.qty}×</span>
              <div>
                <div class="modal-combo-name">${ci.name}</div>
                <div class="modal-combo-unit">Valor individual: ${formatPrice(ci.unitPrice, currencySymbol)} c/u</div>
              </div>
            </div>
            <span class="modal-combo-status ${ci.isAvailable ? 'ok' : 'out'}">
              ${ci.isAvailable ? 'Disponible' : 'Sin stock'}
            </span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  } else {
    if (layersSectionTitle) layersSectionTitle.textContent = 'Desglose de Capas e Ingredientes';
    if (dish.layersOrIngredients && dish.layersOrIngredients.length > 0) {
      dish.layersOrIngredients.forEach((layer) => {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.innerHTML = `
          <div class="layer-header">
            <div class="layer-header-left">
              <div class="layer-icon"><i data-lucide="${layer.icon || 'dot'}"></i></div>
              <span>${layer.name}</span>
            </div>
            <i data-lucide="chevron-down" style="width:16px;height:16px;color:var(--text-muted);"></i>
          </div>
          <div class="layer-detail-box">
            <p>${layer.description}</p>
            ${layer.allergenWarning ? `<span class="allergen-warning-badge">⚠️ ${layer.allergenWarning}</span>` : ''}
          </div>
        `;

        item.addEventListener('click', () => item.classList.toggle('expanded'));
        layersContainer.appendChild(item);
      });
    } else {
      layersContainer.innerHTML =
        '<p style="font-size:0.85rem;color:var(--text-muted);">Sin desglose de ingredientes especificado.</p>';
    }
  }

  const pairingContainer = document.getElementById('modalPairingContainer');
  pairingContainer.innerHTML = '';

  if (dish.pairingSuggestion && dish.pairingSuggestion.name) {
    const pairing = dish.pairingSuggestion;
    pairingContainer.innerHTML = `
      <div class="pairing-card">
        <h4><i data-lucide="glass-water" style="width:14px;height:14px;vertical-align:middle;"></i> Maridaje Recomendado</h4>
        <div class="pairing-title-row">
          <strong>${pairing.name}</strong>
          <span style="font-weight:700;color:var(--accent-gold);">${pairing.formattedPrice || `$ ${pairing.price}`}</span>
        </div>
        <p class="pairing-reason">${pairing.reason}</p>
      </div>
    `;
  }

  document.getElementById('dishModalBackdrop')?.classList.add('open');
  document.getElementById('dishModalSheet')?.classList.add('open');

  if (window.lucide) window.lucide.createIcons();
}
