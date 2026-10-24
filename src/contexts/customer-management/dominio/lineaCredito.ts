import type { Cliente } from './modelos';
import { Decimal, r2 } from '../../../shared/dominio/decimal';
/* ---------- Algoritmo 2: control de línea de crédito ---------- */
export const lineaDisponible = (limite: Decimal, deuda: Decimal) => Decimal.max(0, r2(limite.minus(deuda)));

export const compraPermitida = (limite: Decimal, deuda: Decimal, nueva: Decimal) => deuda.plus(nueva).lte(limite);

/** Capital que el cliente tiene comprometido en su línea; BC 2 lo mantiene con los eventos de ventas y cobros. */
export const saldoComprometidoDe = (c: Pick<Cliente, 'saldoComprometido'>) => c.saldoComprometido ?? '0';
