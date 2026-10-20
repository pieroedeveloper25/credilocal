/**
 * Motor financiero de CrediLocal. Biblioteca pura, sin IO.
 * Reglas: base 360, mes comercial de 30 días, tasas con más de 7 decimales,
 * importes redondeados a 2 decimales (ROUND_HALF_UP) en el momento de calcularse.
 * Ningún importe ni tasa pasa por `number`: todo es Decimal.
 */
import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -30, toExpPos: 40 });

export { Decimal };
export const D = (v: Decimal.Value) => new Decimal(v);
export const r2 = (v: Decimal) => v.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const CERO = new Decimal(0);

/* ---------- Fechas (UTC, sin zona horaria) ---------- */
const MS = 86_400_000;

function ultimoDia(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Construye (anio, mes, dia) saturando al último día del mes. 2026-02-30 -> 2026-02-28. */
export function establecerDia(anio: number, mes: number, dia: number): Date {
  const y = anio + Math.floor((mes - 1) / 12);
  const m = ((((mes - 1) % 12) + 12) % 12) + 1;
  return new Date(Date.UTC(y, m - 1, Math.min(dia, ultimoDia(y, m))));
}

export const agregarMeses = (f: Date, n: number) =>
  establecerDia(f.getUTCFullYear(), f.getUTCMonth() + 1 + n, f.getUTCDate());

export const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / MS);

export const parseFecha = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const dos = (n: number) => String(n).padStart(2, '0');
export const isoFecha = (d: Date) => `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
export const fmtFecha = (d: Date) => `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
export const fechaValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseFecha(s).getTime()) && isoFecha(parseFecha(s)) === s;

/* ---------- Algoritmo 1: conversión de tasas ---------- */
export type TipoTasa = 'Nominal' | 'Efectiva';
export type Capitalizacion = 'Diaria' | 'Mensual';
export interface Tasas { ted: Decimal; tem: Decimal }

/** `valorPct` en porcentaje: 24 = 24 %. */
export function convertirTasas(tipo: TipoTasa, valorPct: Decimal.Value, cap: Capitalizacion = 'Diaria'): Tasas {
  if (!['Nominal','Efectiva'].includes(tipo) || !D(valorPct).isFinite() || D(valorPct).lt(0) || tipo==='Nominal' && !['Diaria','Mensual'].includes(cap)) throw new Error('Tasa o capitalización inválida.');
  const t = D(valorPct).div(100);
  if (tipo === 'Nominal') {
    if (cap === 'Diaria') {
      const ted = t.div(360);
      return { ted, tem: ted.plus(1).pow(30).minus(1) };
    }
    const tem = t.div(12);
    return { ted: tem.plus(1).pow(D(1).div(30)).minus(1), tem };
  }
  return { ted: t.plus(1).pow(D(1).div(360)).minus(1), tem: t.plus(1).pow(D(30).div(360)).minus(1) };
}

/* ---------- Ciclo de corte ---------- */
export interface Ciclo { ciclo: 0 | 1; corte: Date; vencimiento: Date; dias: number }

/** La compra pertenece al ciclo vigente si F_compra <= F_corte de ese mes. */
export function antesDelCorte(fc: Date, diaCorte: number, hora = '00:00', horaCorte = '23:59'): boolean {
  const corte = establecerDia(fc.getUTCFullYear(), fc.getUTCMonth()+1, diaCorte);
  return fc.getTime() < corte.getTime() || fc.getTime() === corte.getTime() && hora <= horaCorte;
}
export function resolverCiclo(fc: Date, diaCorte: number, diaPago: number, hora = '00:00', horaCorte = '23:59'): Ciclo {
  const y = fc.getUTCFullYear();
  const m = fc.getUTCMonth() + 1;
  const corte = establecerDia(y, m, diaCorte);
  if (antesDelCorte(fc, diaCorte, hora, horaCorte)) {
    const v = establecerDia(y, m, diaPago);
    return { ciclo: 0, corte, vencimiento: v, dias: diasEntre(fc, v) };
  }
  const v = establecerDia(y, m + 1, diaPago);
  return { ciclo: 1, corte, vencimiento: v, dias: diasEntre(fc, v) };
}

/* ---------- Prelación del Art. 1257 C.C. ---------- */
export interface Prelacion { mora: Decimal; comp: Decimal; cap: Decimal; saldo: Decimal }

export function imputarPorPrelacion(abono: Decimal, mora: Decimal, comp: Decimal, cap: Decimal): Prelacion {
  const pm = Decimal.min(abono, mora);
  const r1 = abono.minus(pm);
  const pc = Decimal.min(r1, comp);
  const pk = Decimal.min(r1.minus(pc), cap);
  return { mora: r2(pm), comp: r2(pc), cap: r2(pk), saldo: r2(mora.plus(comp).plus(cap).minus(pm).minus(pc).minus(pk)) };
}

/* ---------- Algoritmo 3: liquidación a fin de mes ---------- */
export interface Liquidacion {
  ciclo: 0 | 1; vencimiento: Date; dias: number;
  interesComp: Decimal; montoVencido: Decimal;
  diasMora: number; interesMora: Decimal; deudaTotal: Decimal;
}

export function liquidarFinDeMes(a: {
  capital: Decimal; fechaCompra: Date; diaCorte: number; diaPago: number;
  tedComp: Decimal; tedMora: Decimal; fechaRealPago: Date;
  hora?: string; horaCorte?: string;
}): Liquidacion {
  const c = resolverCiclo(a.fechaCompra, a.diaCorte, a.diaPago, a.hora, a.horaCorte);
  const interesComp = r2(a.capital.mul(a.tedComp.plus(1).pow(c.dias).minus(1)));
  const montoVencido = r2(a.capital.plus(interesComp));
  const diasMora = a.fechaRealPago.getTime() > c.vencimiento.getTime() ? diasEntre(c.vencimiento, a.fechaRealPago) : 0;
  const interesMora = diasMora === 0 ? CERO : r2(montoVencido.mul(a.tedMora.plus(1).pow(diasMora).minus(1)));
  return { ciclo: c.ciclo, vencimiento: c.vencimiento, dias: c.dias, interesComp, montoVencido, diasMora, interesMora, deudaTotal: r2(montoVencido.plus(interesMora)) };
}

/* ---------- Algoritmo 4: cronograma francés con gracia total capitalizable ---------- */
export interface FilaCronograma {
  k: number; fecha: Date; gracia: string; diasPeriodo: number;
  saldoInicial: Decimal; interes: Decimal; cuota: Decimal; amortizacion: Decimal; saldoFinal: Decimal;
}
export interface Cronograma {
  diasGracia: number; capitalAjustado: Decimal; interesGracia: Decimal; cuotaFija: Decimal;
  filas: FilaCronograma[]; totalIntereses: Decimal; totalCuotas: Decimal; totalAmortizado: Decimal; cierra: boolean;
}

export function generarCronogramaFrances(a: {
  capital: Decimal; fechaCompra: Date; diaCorte: number; diaPago: number; ted: Decimal; tem: Decimal; nMeses: number;
  hora?: string; horaCorte?: string;
}): Cronograma {
  const { capital, fechaCompra: fc, ted, tem, nMeses: n } = a;
  if (!capital.isFinite() || capital.lte(0) || !Number.isInteger(n) || n<1 || ted.lt(0) || tem.lt(0)) throw new Error('Capital, tasa o plazo inválido.');
  const y = fc.getUTCFullYear();
  const m = fc.getUTCMonth() + 1;
  const base = establecerDia(y, m, a.diaPago);

  let diasGracia = 0;
  let capitalAjustado = capital;
  if (antesDelCorte(fc, a.diaCorte, a.hora, a.horaCorte)) {
    diasGracia = diasEntre(fc, base);
    capitalAjustado = r2(capital.mul(ted.plus(1).pow(diasGracia)));
  }
  const interesGracia = r2(capitalAjustado.minus(capital));

  const f = tem.plus(1).pow(n);
  const cuotaFija = tem.isZero() ? r2(capitalAjustado.div(n)) : r2(capitalAjustado.mul(tem.mul(f).div(f.minus(1))));

  const filas: FilaCronograma[] = [{
    k: 0, fecha: antesDelCorte(fc,a.diaCorte,a.hora,a.horaCorte) ? base : fc, gracia: diasGracia > 0 ? `T (${diasGracia} d)` : 'S', diasPeriodo: diasGracia,
    saldoInicial: capital, interes: interesGracia, cuota: CERO, amortizacion: CERO, saldoFinal: capitalAjustado,
  }];

  let si = capitalAjustado;
  let totalIntereses = interesGracia, totalCuotas = CERO, totalAmortizado = CERO;
  for (let k = 1; k <= n; k++) {
    const interes = r2(si.mul(tem));
    let amort: Decimal, cuota: Decimal, sf: Decimal;
    if (k === n) { amort = si; cuota = r2(amort.plus(interes)); sf = CERO; }   // ajuste final: SF_n = 0.00 exacto
    else { cuota = cuotaFija; amort = r2(cuota.minus(interes)); sf = r2(si.minus(amort)); }
    if (cuota.lte(0) || amort.lt(0) || amort.gt(si) || sf.lt(0)) throw new Error('El monto y plazo generan cuotas inválidas al redondear a centavos. Aumente el monto o reduzca las cuotas.');
    filas.push({ k, fecha: establecerDia(y, m + k, a.diaPago), gracia: 'S', diasPeriodo: 30, saldoInicial: si, interes, cuota, amortizacion: amort, saldoFinal: sf });
    totalIntereses = totalIntereses.plus(interes); totalCuotas = totalCuotas.plus(cuota); totalAmortizado = totalAmortizado.plus(amort);
    si = sf;
  }
  return { diasGracia, capitalAjustado, interesGracia, cuotaFija, filas, totalIntereses, totalCuotas, totalAmortizado, cierra: si.isZero() };
}

/* ---------- Algoritmo 2: control de línea de crédito ---------- */
export const lineaDisponible = (limite: Decimal, deuda: Decimal) => Decimal.max(0, r2(limite.minus(deuda)));
export const compraPermitida = (limite: Decimal, deuda: Decimal, nueva: Decimal) => deuda.plus(nueva).lte(limite);
