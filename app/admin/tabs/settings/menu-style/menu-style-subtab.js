/**
 * Subpestaña de Configuración: Configuración del Menú (Estilo, Moneda & Colores)
 * HTML asociado: /admin/tabs/settings/menu-style/menu-style-subtab.html
 */

import { db } from '../../../../shared/db.js';

const PALETTE_20_COLORS = [
  { hex: '#207567', label: 'Teal Esmeralda' },
  { hex: '#7c4a27', label: 'Café & Moka' },
  { hex: '#0284c7', label: 'Azul Celeste' },
  { hex: '#3b82f6', label: 'Azul Real' },
  { hex: '#6366f1', label: 'Índigo' },
  { hex: '#8b5cf6', label: 'Púrpura' },
  { hex: '#d946ef', label: 'Fucsia' },
  { hex: '#e11d48', label: 'Rojo Rubí' },
  { hex: '#ea580c', label: 'Naranja Coral' },
  { hex: '#f59e0b', label: 'Ámbar Cálido' },
  { hex: '#10b981', label: 'Verde Esmeralda' },
  { hex: '#06b6d4', label: 'Cian Eléctrico' },
  { hex: '#16a34a', label: 'Verde Hoja' },
  { hex: '#ca8a04', label: 'Dorado Bronce' },
  { hex: '#9333ea', label: 'Violeta Intenso' },
  { hex: '#0d9488', label: 'Verde Jade' },
  { hex: '#ec4899', label: 'Rosa Intenso' },
  { hex: '#ef4444', label: 'Rojo Carmesí' },
  { hex: '#84cc16', label: 'Verde Lima' },
  { hex: '#0f172a', label: 'Negro Azabache' }
];

let styleContext = {
  getProfileId: () => 'restaurant',
  showToast: () => {},
  onSaved: () => {}
};

function render20ColorSwatches(selectedHex) {
  const container = document.getElementById('swatchesGrid20');
  if (!container) return;

  container.innerHTML = '';
  const activeColor = (selectedHex || '#207567').toLowerCase();

  PALETTE_20_COLORS.forEach((colorItem) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isWhite = colorItem.hex.toLowerCase() === '#ffffff';
    btn.className = `swatch-btn-20 ${colorItem.hex.toLowerCase() === activeColor ? 'active' : ''} ${isWhite ? 'is-white-swatch' : ''}`;
    btn.style.backgroundColor = colorItem.hex;
    btn.dataset.color = colorItem.hex;
    btn.title = colorItem.label;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.swatch-btn-20').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const inputAccent = document.getElementById('inputAccentColor');
      if (inputAccent) inputAccent.value = colorItem.hex;
    });

    container.appendChild(btn);
  });
}

export function loadMenuStyleSubtab(config, profileId) {
  const defaultAccent = profileId === 'restaurant' ? '#207567' : '#7c4a27';
  let savedAccentColor = config.accentColor;
  if (!savedAccentColor || savedAccentColor.toLowerCase() === '#ffffff') {
    savedAccentColor = defaultAccent;
  }

  const inputThemeMode = document.getElementById('inputThemeMode');
  if (inputThemeMode) {
    inputThemeMode.value = config.themeMode || (profileId === 'restaurant' ? 'dark' : 'light');
  }

  const inputShowPrepTime = document.getElementById('inputShowPrepTime');
  if (inputShowPrepTime) {
    inputShowPrepTime.checked = config.showPrepTime !== false;
  }

  const inputAccentColor = document.getElementById('inputAccentColor');
  if (inputAccentColor) inputAccentColor.value = savedAccentColor;

  render20ColorSwatches(savedAccentColor);

  const currencySelect = document.getElementById('inputCurrency');
  if (currencySelect) {
    for (const opt of currencySelect.options) {
      if (opt.dataset.code === config.currencyCode || (config.currencySymbol && opt.value === config.currencySymbol)) {
        opt.selected = true;
        break;
      }
    }
  }
}

export function initMenuStyleSubtab(context = {}) {
  styleContext = { ...styleContext, ...context };

  const form = document.getElementById('themeConfigForm');
  if (!form) return;

  const colorInput = document.getElementById('inputAccentColor');
  const currencySelect = document.getElementById('inputCurrency');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const profileId = styleContext.getProfileId();
    const symbol = currencySelect ? currencySelect.value : '$';
    const code =
      currencySelect && currencySelect.options[currencySelect.selectedIndex]
        ? currencySelect.options[currencySelect.selectedIndex].dataset.code || 'ARS'
        : 'ARS';

    const inputShowPrepTime = document.getElementById('inputShowPrepTime');
    const inputThemeMode = document.getElementById('inputThemeMode');
    const currentConfig = db.getThemeConfig(profileId);

    db.saveThemeConfig(profileId, {
      ...currentConfig,
      accentColor: colorInput ? colorInput.value : '#207567',
      currencySymbol: symbol,
      currencyCode: code,
      themeMode: inputThemeMode ? inputThemeMode.value : 'dark',
      showPrepTime: inputShowPrepTime ? inputShowPrepTime.checked : true
    });

    styleContext.showToast(`Configuración del menú guardada (${code} ${symbol})`);
    styleContext.onSaved(symbol);
  });
}
