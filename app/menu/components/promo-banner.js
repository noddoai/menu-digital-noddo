/**
 * Componente Carrusel de Banners Promocionales
 */

import { db } from '../../shared/db.js';
import { resolveAssetUrl } from '../../shared/utils/asset-url.js';

let promoCarouselTimer = null;
let currentPromoSlideIndex = 0;

export function renderPromoBanner({ profileId }) {
  const container = document.getElementById('promoBannerContainer');
  if (!container) return;

  if (promoCarouselTimer) {
    clearInterval(promoCarouselTimer);
    promoCarouselTimer = null;
  }

  const banners = db.getPromoBanners(profileId).filter((b) => b.enabled !== false);
  if (!banners || banners.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="promo-carousel-container">
      <div class="promo-carousel-track" id="promoCarouselTrack">
        ${banners
          .map(
            (b, idx) => `
          <div class="promo-slide" data-index="${idx}">
            <img src="${resolveAssetUrl(b.image) || '/assets/images/specialty_coffee.png'}" alt="${b.title || 'Banner Promocional'}" class="promo-slide-img" style="width: 100%; height: 100%; object-fit: cover;">
            ${
              b.showTextOverlay && (b.title || b.badge)
                ? `
              <div class="promo-slide-overlay">
                ${b.badge ? `<span class="promo-slide-badge">${b.badge}</span>` : ''}
                ${b.title ? `<h3 class="promo-slide-title">${b.title}</h3>` : ''}
                ${b.subtitle ? `<p class="promo-slide-subtitle">${b.subtitle}</p>` : ''}
              </div>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>

      ${
        banners.length > 1
          ? `
        <button class="promo-nav-btn promo-nav-prev" id="btnPromoPrev" aria-label="Anterior"><i data-lucide="chevron-left"></i></button>
        <button class="promo-nav-btn promo-nav-next" id="btnPromoNext" aria-label="Siguiente"><i data-lucide="chevron-right"></i></button>
        <div class="promo-carousel-dots" id="promoCarouselDots">
          ${banners.map((_, idx) => `<div class="promo-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`).join('')}
        </div>
      `
          : ''
      }
    </div>
  `;

  if (banners.length > 1) {
    const track = document.getElementById('promoCarouselTrack');
    const dots = document.querySelectorAll('.promo-dot');
    currentPromoSlideIndex = 0;

    const goToSlide = (index) => {
      currentPromoSlideIndex = (index + banners.length) % banners.length;
      if (track) track.style.transform = `translateX(-${currentPromoSlideIndex * 100}%)`;
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentPromoSlideIndex);
      });
    };

    document.getElementById('btnPromoPrev')?.addEventListener('click', () => goToSlide(currentPromoSlideIndex - 1));
    document.getElementById('btnPromoNext')?.addEventListener('click', () => goToSlide(currentPromoSlideIndex + 1));
    dots.forEach((dot) => {
      dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index, 10)));
    });

    promoCarouselTimer = setInterval(() => {
      goToSlide(currentPromoSlideIndex + 1);
    }, 5000);
  }

  if (window.lucide) window.lucide.createIcons();
}
