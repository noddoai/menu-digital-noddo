/**
 * Componente Vista Previa Smartphone (iframe en tiempo real)
 */

const PREVIEW_ROUTES = {
  'le-passport-nice': '/passport.html',
  bakery_cafe: '/cafe.html',
  restaurant: '/restaurant.html'
};

export function getPreviewTargetUrl(profileId) {
  return PREVIEW_ROUTES[profileId] || PREVIEW_ROUTES.restaurant;
}

export function reloadPhonePreview(profileId) {
  const iframe = document.getElementById('phonePreviewIframe');
  if (!iframe) return;

  const targetSrc = getPreviewTargetUrl(profileId);
  if (!iframe.src || iframe.src.indexOf(targetSrc) === -1) {
    iframe.src = targetSrc;
    return;
  }

  if (iframe.contentWindow) {
    try {
      iframe.contentWindow.location.reload();
    } catch (e) {
      console.log('Error recargando vista previa:', e);
    }
  }
}

export function setupPhonePreview({ getProfileId, onReload } = {}) {
  const btnReload = document.getElementById('btnReloadPhoneFrame');
  if (!btnReload) return;

  btnReload.addEventListener('click', () => {
    const profileId = typeof getProfileId === 'function' ? getProfileId() : 'restaurant';
    reloadPhonePreview(profileId);
    if (typeof onReload === 'function') onReload();
  });
}
