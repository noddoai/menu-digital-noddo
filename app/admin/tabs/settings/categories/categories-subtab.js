/**
 * Subpestaña de Configuración: Categorías
 * HTML asociado: /admin/tabs/settings/categories/categories-subtab.html
 */

import { db } from '../../../../shared/db.js';

let categoriesContext = {
  getProfileId: () => 'restaurant',
  showToast: () => {},
  onCategoriesUpdated: () => {}
};

export function renderCategoriesSubtab() {
  const stack = document.getElementById('categoriesListStack');
  if (!stack) return;

  const profileId = categoriesContext.getProfileId();
  const categories = db.getCategories(profileId);
  const dishes = db.getItemsByProfile(profileId);

  stack.innerHTML = '';

  categories.forEach((cat) => {
    if (cat.id === 'all') return;

    const count = dishes.filter((d) => d.category === cat.id).length;

    const row = document.createElement('div');
    row.className = 'category-item-row';
    row.innerHTML = `
      <div class="category-item-info">
        <div class="category-item-name">${cat.name}</div>
        <div class="category-item-count">${count} plato(s) asociado(s)</div>
      </div>
      <button type="button" class="btn-admin-danger btn-delete-category" data-cat-id="${cat.id}" style="padding: 5px 10px; font-size: 0.75rem;">
        <i data-lucide="trash-2" style="width:12px;height:12px;"></i> Eliminar
      </button>
    `;

    row.querySelector('.btn-delete-category').addEventListener('click', () => {
      if (confirm(`¿Está seguro de eliminar la categoría "${cat.name}"?`)) {
        db.deleteCategory(profileId, cat.id);
        categoriesContext.showToast(`Categoría "${cat.name}" eliminada`);
        renderCategoriesSubtab();
        categoriesContext.onCategoriesUpdated();
      }
    });

    stack.appendChild(row);
  });

  if (window.lucide) window.lucide.createIcons();
}

export function initCategoriesSubtab(context = {}) {
  categoriesContext = { ...categoriesContext, ...context };

  const form = document.getElementById('addCategoryForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newCategoryName');
    const categoryName = input ? input.value.trim() : '';
    if (!categoryName) return;

    db.addCategory(categoriesContext.getProfileId(), categoryName);
    categoriesContext.showToast(`Categoría "${categoryName}" creada exitosamente`);
    input.value = '';

    renderCategoriesSubtab();
    categoriesContext.onCategoriesUpdated();
  });
}
