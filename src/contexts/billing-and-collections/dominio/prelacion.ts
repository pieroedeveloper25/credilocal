import { Decimal, r2 } from '../../../shared/dominio/decimal';
/* ---------- Prelación del Art. 1257 C.C. ---------- */
export interface Prelacion { mora: Decimal; comp: Decimal; cap: Decimal; saldo: Decimal }

export function imputarPorPrelacion(abono: Decimal, mora: Decimal, comp: Decimal, cap: Decimal): Prelacion {
  const pm = Decimal.min(abono, mora);
  const r1 = abono.minus(pm);
  const pc = Decimal.min(r1, comp);
  const pk = Decimal.min(r1.minus(pc), cap);
  return { mora: r2(pm), comp: r2(pc), cap: r2(pk), saldo: r2(mora.plus(comp).plus(cap).minus(pm).minus(pc).minus(pk)) };
}
