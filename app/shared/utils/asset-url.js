/**
 * Normaliza URLs de assets locales para que funcionen desde cualquier subruta (/admin/, /menu/, etc.).
 * Mantiene intactas URLs absolutas (http/https), data URIs o rutas que ya inician con '/'.
 */
export function resolveAssetUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  return `/${trimmed.replace(/^\.\//, '')}`;
}
