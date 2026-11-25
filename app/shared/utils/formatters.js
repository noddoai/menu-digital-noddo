/**
 * Helpers compartidos de formato de moneda y precios.
 */

export function formatPrice(amount, symbol = '$') {
  if (amount === undefined || amount === null || isNaN(amount)) return '';
  const num = Number(amount);

  if (symbol === '€') {
    const formatted = num.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${formatted} €`;
  }

  const formatted =
    num % 1 !== 0
      ? num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : num.toLocaleString('es-AR');
  return `${symbol} ${formatted}`;
}
