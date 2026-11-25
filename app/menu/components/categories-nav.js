/**
 * Componente Navegación de Categorías y Scroll-Spy
 */

import { db } from '../../shared/db.js';

const CATEGORY_ICON_FALLBACKS = {
  all: 'sparkles',
  principales: 'utensils',
  entradas: 'salad',
  postres: 'cake-slice',
  pasteleria: 'cake',
  cafe_especialidad: 'coffee',
  brunch: 'sandwich',
  bebidas_frias: 'cup-soda',
  cocteleria: 'wine'
};

let scrollSpyAttached = false;

function getCategoryIcon(catId, providedIcon) {
  if (providedIcon) return providedIcon;
  return CATEGORY_ICON_FALLBACKS[catId] || 'tag';
}

export function setActiveCategoryPill(catId) {
  const navWrapper = document.querySelector('.category-nav-wrapper');
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach((p) => {
    const isMatch = p.dataset.catId === catId;
    p.classList.toggle('active', isMatch);
    if (isMatch && navWrapper) {
      const targetLeft = p.offsetLeft - navWrapper.clientWidth / 2 + p.clientWidth / 2;
      navWrapper.scrollLeft = Math.max(0, targetLeft);
    }
  });
}

export function setupCategoryScrollSpy({ isProgrammaticScroll, getActiveCategory, onActiveCategoryChange }) {
  if (scrollSpyAttached) return;
  scrollSpyAttached = true;

  let ticking = false;
  const onScroll = () => {
    if (isProgrammaticScroll()) return;
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      ticking = false;
      if (isProgrammaticScroll()) return;
      const sections = document.querySelectorAll('.menu-category-section');
      if (sections.length === 0) return;

      const headerEl = document.querySelector('.app-header');
      const offset = (headerEl ? headerEl.getBoundingClientRect().height : 130) + 40;
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      const winHeight = window.innerHeight || document.documentElement.clientHeight;
      const atBottom = scrollY + winHeight >= docHeight - 16;

      let nextCatId = null;
      if (scrollY < 60) {
        nextCatId = 'all';
      } else if (atBottom) {
        nextCatId = sections[sections.length - 1].dataset.catId;
      } else {
        nextCatId = sections[0].dataset.catId;
        sections.forEach((sec) => {
          if (sec.getBoundingClientRect().top <= offset) {
            nextCatId = sec.dataset.catId;
          }
        });
      }

      if (nextCatId && nextCatId !== getActiveCategory()) {
        onActiveCategoryChange(nextCatId);
        setActiveCategoryPill(nextCatId);
      }
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  document.body.addEventListener('scroll', onScroll, { passive: true });
}

export function renderCategoriesNav({ profileId, categories, activeCategory, onCategorySelect }) {
  const navContainer = document.getElementById('categoryNavList');
  if (!navContainer) return;

  navContainer.innerHTML = '';

  const allProfileItems = db.getItemsByProfile(profileId);
  const visibleCategories = categories.filter((cat) => {
    if (cat.id === 'all') return true;
    return allProfileItems.some((d) => d.category === cat.id);
  });

  visibleCategories.forEach((cat) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cat-pill ${activeCategory === cat.id ? 'active' : ''}`;
    button.dataset.catId = cat.id;

    button.innerHTML = `
      <i data-lucide="${getCategoryIcon(cat.id, cat.icon)}"></i>
      <span>${cat.name}</span>
    `;

    button.addEventListener('click', () => {
      onCategorySelect(cat.id);
      document.querySelectorAll('.cat-pill').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');

      const navWrapper = document.querySelector('.category-nav-wrapper');
      if (navWrapper) {
        const targetLeft = button.offsetLeft - navWrapper.clientWidth / 2 + button.clientWidth / 2;
        navWrapper.scrollLeft = Math.max(0, targetLeft);
      }

      if (cat.id === 'all') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const targetSection = document.getElementById(`cat-section-${cat.id}`);
      if (targetSection) {
        const headerEl = document.querySelector('.app-header');
        const headerOffset = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) + 12 : 165;
        targetSection.style.scrollMarginTop = `${headerOffset}px`;
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    navContainer.appendChild(button);
  });

  if (window.lucide) window.lucide.createIcons();
}
