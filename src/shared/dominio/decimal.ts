/** Aritmética decimal compartida: precisión de 40 dígitos y redondeo ROUND_HALF_UP. */
import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -30, toExpPos: 40 });

export { Decimal };
export const D = (v: Decimal.Value) => new Decimal(v);
export const r2 = (v: Decimal) => v.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
