/**
 * Módulo de Pestaña: Código QR
 * HTML asociado: /admin/tabs/qr/qr-tab.html
 */
  
const STORE_CONFIG = {
  restaurant: { page: 'restaurant.html', name: 'Gourmet Bistro & Grill' },
  bakery_cafe: { page: 'cafe.html', name: 'Maison Cafe & Bakery' },
  'le-passport-nice': { page: 'passport.html', name: "Le Pass'Port Nice" }
};

function getTargetMenuUrl(profileId) {
  const cfg = STORE_CONFIG[profileId] || STORE_CONFIG.bakery_cafe;
  return `${window.location.origin}/${cfg.page}`;
}

function buildQrImageUrl(fullUrl, format = 'png') {
  return `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(fullUrl)}&format=${format}&color=0-0-0&bgcolor=255-255-255&margin=10`;
}

export function renderQrTab(profileId) {
  const qrImg = document.getElementById('qrCodeImage');
  const urlInput = document.getElementById('qrTargetUrlText');
  const storeNameEl = document.getElementById('qrCurrentStoreName');
  const btnOpen = document.getElementById('btnOpenQrUrl');
  if (!qrImg) return;

  const cfg = STORE_CONFIG[profileId] || STORE_CONFIG.bakery_cafe;
  const fullUrl = getTargetMenuUrl(profileId);

  if (urlInput) urlInput.value = fullUrl;
  if (storeNameEl) storeNameEl.textContent = cfg.name;
  if (btnOpen) btnOpen.href = fullUrl;

  qrImg.src = buildQrImageUrl(fullUrl, 'png');
}

function downloadQr(profileId, format, showToast) {
  const fullUrl = getTargetMenuUrl(profileId);
  const qrApiUrl = buildQrImageUrl(fullUrl, format);

  const a = document.createElement('a');
  a.href = qrApiUrl;
  a.download = `QR-Menu-${profileId}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast?.(`Descargando Código QR (${format.toUpperCase()})`);
}

export function initQrTab({ getProfileId, showToast } = {}) {
  const btnPng = document.getElementById('btnDownloadQrPng');
  const btnSvg = document.getElementById('btnDownloadQrSvg');
  const btnCopy = document.getElementById('btnCopyQrUrl');

  const resolveProfile = () => (typeof getProfileId === 'function' ? getProfileId() : 'restaurant');

  btnPng?.addEventListener('click', () => downloadQr(resolveProfile(), 'png', showToast));
  btnSvg?.addEventListener('click', () => downloadQr(resolveProfile(), 'svg', showToast));

  btnCopy?.addEventListener('click', async () => {
    const fullUrl = getTargetMenuUrl(resolveProfile());
    try {
      await navigator.clipboard.writeText(fullUrl);
      showToast?.('📋 Enlace copiado al portapapeles');
      const originalHtml = btnCopy.innerHTML;
      btnCopy.innerHTML = '<i data-lucide="check"></i> Copiado!';
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => {
        btnCopy.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }, 2000);
    } catch {
      showToast?.('Enlace listo para copiar');
    }
  });
}
