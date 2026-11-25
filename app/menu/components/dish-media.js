/**
 * Helpers de resolución y detección de medios (imágenes/videos) de platos.
 */

import { resolveAssetUrl } from '../../shared/utils/asset-url.js';

export function getDishImageUrl(dish) {
  if (dish.media?.heroImage) return resolveAssetUrl(dish.media.heroImage);
  if (dish.heroImage_url) return resolveAssetUrl(dish.heroImage_url);
  if (dish.heroImage) return resolveAssetUrl(dish.heroImage);

  if (dish.businessProfile === 'le-passport-nice') {
    if (dish.category === 'galettes') return '/assets/images/le-passport-nice/galettes.png';
    if (dish.category === 'crepes') return '/assets/images/le-passport-nice/crepes.png';
    if (dish.category === 'petit_dejeuner') return '/assets/images/le-passport-nice/Viennoiserie.png';
    if (dish.category === 'plats_du_jour') return '/assets/images/le-passport-nice/entrecote.png';
    if (dish.category === 'cocktails') return '/assets/images/signature_cocktail.png';
    if (dish.category === 'bieres_cidre' || dish.category === 'boissons_froides') {
      return '/assets/images/specialty_coffee.png';
    }
  }
  return '';
}

export function dishHasMedia(dish) {
  if (!dish) return false;
  const hasVideo = Boolean(dish.media?.videoLoopUrl && dish.media.videoLoopUrl.trim());
  const hero = (dish.media?.heroImage || dish.hero_image_url || dish.heroImage || dish.heroImage_url || '').trim();
  if (hasVideo || hero) return true;
  if (dish.businessProfile === 'le-passport-nice') {
    return Boolean(getDishImageUrl(dish));
  }
  return false;
}
