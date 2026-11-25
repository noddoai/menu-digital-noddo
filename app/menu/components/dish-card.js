/**
 * Componente Tarjeta de Plato (Modo Visual y Modo Compacto)
 */

import { db } from '../../shared/db.js';
import { formatPrice } from '../../shared/utils/formatters.js';
import { dishHasMedia, getDishImageUrl } from './dish-media.js';

export function createVisualCard(dish, { profileId, currencySymbol, onSelectDish }) {
  const card = document.createElement('article');
  const hasMedia = dishHasMedia(dish);
  card.className = `dish-card-visual ${hasMedia ? '' : 'dish-card-no-media'}`.trim();

  const comboInfo = db.resolveCombo(dish);
  const effectiveAvailable = dish.isAvailable && (!comboInfo || comboInfo.allComponentsAvailable);

  const hasMultipleSizes = dish.hasVariations && Array.isArray(dish.variations) && dish.variations.length > 1;
  const lowestPrice = hasMultipleSizes
    ? Math.min(...dish.variations.map((v) => Number(v.price) || 0))
    : Number(dish.price) || 0;

  const formattedPrice = hasMultipleSizes
    ? `<span class="card-price-prefix">Desde</span> ${formatPrice(lowestPrice, currencySymbol)}`
    : formatPrice(dish.price, currencySymbol);

  const comboPriceCompareHTML =
    comboInfo && comboInfo.savingsAmount > 0
      ? `<span class="combo-regular-price">${formatPrice(comboInfo.regularTotal, currencySymbol)}</span>`
      : '';

  const hasVideo = !!dish.media?.videoLoopUrl;
  const hasAR = !!dish.media?.model3dUrl;
  const isFrench = profileId === 'le-passport-nice' || document.documentElement.lang === 'fr';

  const comboBadgeHTML = comboInfo
    ? `<span class="badge badge-combo"><i data-lucide="package" style="width:11px;height:11px;"></i> COMBO${comboInfo.savingsPercent > 0 ? ` · -${comboInfo.savingsPercent}%` : ''}</span>`
    : '';

  const sizeBadgeHTML = hasMultipleSizes
    ? `<span class="badge badge-size-options"><i data-lucide="layers"></i> ${dish.variations.length} tamaños</span>`
    : '';

  const dietaryTags = [];
  if (dish.dietaryFlags?.isGlutenFree) dietaryTags.push(isFrench ? 'Sans gluten' : 'Sin TACC');
  if (dish.dietaryFlags?.isVegan) dietaryTags.push(isFrench ? 'Végan' : 'Vegano');
  if (dish.dietaryFlags?.isVegetarian) dietaryTags.push(isFrench ? 'Végétarien' : 'Vegetariano');
  if (dish.dietaryFlags && !dish.dietaryFlags.containsDairy) dietaryTags.push(isFrench ? 'Sans lactose' : 'Sin Lactosa');

  const tagsHTML = dietaryTags.map((t) => `<span class="tag-diet">${t}</span>`).join('');

  const unavailableSubtext =
    comboInfo && !comboInfo.allComponentsAvailable
      ? `Falta stock de: ${comboInfo.unavailableNames.join(', ')}`
      : 'Consulte con su mozo disponibilidad próxima';

  const unavailableOverlay = !effectiveAvailable
    ? `
    <div class="card-unavailable-overlay">
      <span>${isFrench ? 'Épuisé temporairement' : 'Agotado Temporalmente'}</span>
      <p style="font-size: 0.75rem; margin-top: 6px;">${isFrench ? 'Consultez votre serveur' : unavailableSubtext}</p>
    </div>
  `
    : '';

  const comboIncludesHTML = comboInfo
    ? `
    <div class="combo-includes-box">
      <div class="combo-includes-label"><i data-lucide="check-circle-2" style="width:13px;height:13px;"></i> Incluye:</div>
      <ul class="combo-includes-list">
        ${comboInfo.items
          .map(
            (ci) => `
          <li class="${ci.isAvailable ? '' : 'combo-item-missing'}">
            <strong>${ci.qty}×</strong> ${ci.name}
          </li>
        `
          )
          .join('')}
      </ul>
    </div>
  `
    : '';

  const themeConfig = db.getThemeConfig(profileId);
  const showPrepTime = themeConfig ? themeConfig.showPrepTime !== false : true;
  const hasPrepTime = Boolean(dish.prepTime && dish.prepTime.trim());
  const timeBadgeHTML =
    showPrepTime && hasPrepTime
      ? `
    <div class="time-badge">
      <i data-lucide="clock" style="width:11px;height:11px;"></i> ${dish.prepTime.trim()}
    </div>
  `
      : '';

  let variationsHTML = '';
  if (hasMultipleSizes) {
    variationsHTML = `
      <div class="card-sizes-pills-row" title="Porciones disponibles en la carta">
        ${dish.variations
          .map(
            (v) => `
          <div class="portion-badge-chip">
            <span class="portion-badge-name">${v.name}</span>
            <span class="portion-badge-price">${formatPrice(v.price, currencySymbol)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  if (hasMedia) {
    const mediaHTML = hasVideo
      ? `
      <video data-lazy-video src="${dish.media.videoLoopUrl}" poster="${getDishImageUrl(dish)}" loop muted playsinline aria-label="${dish.name} video"></video>
      <div class="badge-video" title="Micro-video de cocción"><i data-lucide="play" style="width:12px;height:12px;"></i></div>
    `
      : `
      <img src="${getDishImageUrl(dish)}" alt="${dish.name}" loading="lazy">
    `;

    const badgesHTML = `
      <div class="badge-container">
        ${comboBadgeHTML}
        ${dish.isChefSpecial ? '<span class="badge badge-chef">Sugerencia Chef</span>' : ''}
        ${sizeBadgeHTML}
        ${hasAR ? '<span class="badge badge-ar"><i data-lucide="box" style="width:12px;height:12px;"></i> 3D AR</span>' : ''}
      </div>
    `;

    card.innerHTML = `
      ${unavailableOverlay}
      <div class="card-media-box">
        ${badgesHTML}
        ${mediaHTML}
        ${timeBadgeHTML ? `<div class="card-meta-badges">${timeBadgeHTML}</div>` : ''}
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <h3>${dish.name}</h3>
          <div class="card-price-stack">
            ${comboPriceCompareHTML}
            <span class="card-price">${formattedPrice}</span>
          </div>
        </div>
        <p class="card-description">${dish.shortDescription || ''}</p>
        ${comboIncludesHTML}
        ${variationsHTML}
        <div class="dietary-tags-row">
          ${tagsHTML}
        </div>
        <div class="card-footer-actions">
          <button type="button" class="btn-open-detail">
            <i data-lucide="eye" style="width:16px;height:16px;"></i> ${comboInfo ? 'Ver Detalle del Combo' : isFrench ? 'Détails & Ingrédients' : 'Ver Plato y Detalles'}
          </button>
        </div>
      </div>
    `;

    card.querySelector('.card-media-box')?.addEventListener('click', () => onSelectDish?.(dish));
  } else {
    const topBadges = [];
    if (comboBadgeHTML) topBadges.push(comboBadgeHTML);
    if (dish.isChefSpecial) topBadges.push('<span class="badge badge-chef">Sugerencia Chef</span>');
    if (sizeBadgeHTML) topBadges.push(sizeBadgeHTML);
    if (hasAR) topBadges.push('<span class="badge badge-ar"><i data-lucide="box" style="width:12px;height:12px;"></i> 3D AR</span>');
    if (timeBadgeHTML) topBadges.push(timeBadgeHTML);

    const topBadgesHTML =
      topBadges.length > 0
        ? `
      <div class="card-top-badges-inline">
        ${topBadges.join('')}
      </div>
    `
        : '';

    card.innerHTML = `
      ${unavailableOverlay}
      <div class="card-body">
        ${topBadgesHTML}
        <div class="card-title-row">
          <h3>${dish.name}</h3>
          <div class="card-price-stack">
            ${comboPriceCompareHTML}
            <span class="card-price">${formattedPrice}</span>
          </div>
        </div>
        <p class="card-description">${dish.shortDescription || ''}</p>
        ${comboIncludesHTML}
        ${variationsHTML}
        <div class="dietary-tags-row">
          ${tagsHTML}
        </div>
        <div class="card-footer-actions">
          <button type="button" class="btn-open-detail">
            <i data-lucide="eye" style="width:16px;height:16px;"></i> ${comboInfo ? 'Ver Detalle del Combo' : 'Ver Plato y Detalles'}
          </button>
        </div>
      </div>
    `;
  }

  card.querySelector('.btn-open-detail')?.addEventListener('click', (e) => {
    e.stopPropagation();
    onSelectDish?.(dish);
  });
  card.addEventListener('click', () => onSelectDish?.(dish));

  return card;
}

export function createCompactCard(dish, { profileId, currencySymbol, onSelectDish }) {
  const card = document.createElement('article');
  card.className = 'dish-card-compact';

  const isFrench = profileId === 'le-passport-nice' || document.documentElement.lang === 'fr';
  const comboInfo = db.resolveCombo(dish);
  const effectiveAvailable = dish.isAvailable && (!comboInfo || comboInfo.allComponentsAvailable);

  const hasMultipleSizes = dish.hasVariations && Array.isArray(dish.variations) && dish.variations.length > 1;
  const lowestPrice = hasMultipleSizes
    ? Math.min(...dish.variations.map((v) => Number(v.price) || 0))
    : Number(dish.price) || 0;

  const formattedPrice = hasMultipleSizes
    ? `Desde ${formatPrice(lowestPrice, currencySymbol)}`
    : formatPrice(dish.price, currencySymbol);

  const comboSummary = comboInfo
    ? `<div class="compact-combo-items">${comboInfo.items.map((ci) => `${ci.qty}× ${ci.name}`).join(' · ')}</div>`
    : '';

  const comboBadge = comboInfo
    ? `<span class="compact-combo-badge">COMBO${comboInfo.savingsPercent > 0 ? ` -${comboInfo.savingsPercent}%` : ''}</span>`
    : '';

  const regularPriceHTML =
    comboInfo && comboInfo.savingsAmount > 0
      ? `<span class="combo-regular-price">${formatPrice(comboInfo.regularTotal, currencySymbol)}</span>`
      : '';

  card.innerHTML = `
    <div class="compact-info">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px;">
        <h4 style="margin:0;">${dish.name}</h4>
        ${comboBadge}
      </div>
      <p>${dish.shortDescription || ''}</p>
      ${comboSummary}
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
      ${regularPriceHTML}
      <span class="compact-price">${formattedPrice}</span>
      ${hasMultipleSizes ? `<span class="compact-size-tag"><i data-lucide="layers" style="width:10px;height:10px;"></i> ${dish.variations.length} tamaños</span>` : ''}
      ${!effectiveAvailable ? `<span style="font-size:0.7rem;color:var(--status-out-text);font-weight:700;">${isFrench ? 'Épuisé' : 'Agotado'}</span>` : ''}
    </div>
  `;

  card.addEventListener('click', () => onSelectDish?.(dish));
  return card;
}
