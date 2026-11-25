/**
 * Componente Carrusel Horizontal "Los Más Elegidos"
 */

import { db } from '../../shared/db.js';
import { formatPrice } from '../../shared/utils/formatters.js';
import { dishHasMedia, getDishImageUrl } from './dish-media.js';

export function renderFeaturedCarousel({ profileId, currencySymbol, onSelectDish }) {
  const section = document.getElementById('featuredSection');
  const carousel = document.getElementById('featuredCarousel');
  if (!section || !carousel) return;

  const featuredItems = db.getFeaturedItems(profileId);
  if (featuredItems.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  carousel.innerHTML = '';

  const themeConfig = db.getThemeConfig(profileId);
  const showPrepTime = themeConfig ? themeConfig.showPrepTime !== false : true;

  featuredItems.forEach((item) => {
    const card = document.createElement('div');
    const hasMedia = dishHasMedia(item);
    card.className = `featured-card ${hasMedia ? '' : 'featured-card-no-media'}`.trim();

    const formattedPrice = formatPrice(item.price, currencySymbol);
    const hasPrepTime = Boolean(item.prepTime && item.prepTime.trim());
    const timeBadgeHTML =
      showPrepTime && hasPrepTime
        ? `
      <div class="card-meta-badges">
        <div class="time-badge">
          <i data-lucide="clock" style="width:11px;height:11px;"></i> ${item.prepTime.trim()}
        </div>
      </div>`
        : '';

    const mediaHTML = hasMedia
      ? `
      <div class="featured-card-media">
        <img src="${getDishImageUrl(item)}" alt="${item.name}" loading="lazy">
        ${timeBadgeHTML}
      </div>`
      : '';

    const inlineTimeBadge =
      !hasMedia && showPrepTime && hasPrepTime
        ? `
      <div class="time-badge" style="margin-bottom:6px;width:fit-content;">
        <i data-lucide="clock" style="width:11px;height:11px;"></i> ${item.prepTime.trim()}
      </div>`
        : '';

    card.innerHTML = `
      ${mediaHTML}
      <div class="featured-card-body">
        ${inlineTimeBadge}
        <h4>${item.name}</h4>
        <span class="featured-card-price">${formattedPrice}</span>
      </div>
    `;

    card.addEventListener('click', () => onSelectDish?.(item));
    carousel.appendChild(card);
  });
}
