import { describe, expect, it } from 'vitest';
import { imputarPorPrelacion } from '../../billing-and-collections/dominio/prelacion';
import { convertirTasas, generarCronogramaFrances, liquidarFinDeMes, resolverCiclo } from './motor';
import { compraPermitida, lineaDisponible } from '../../customer-management/dominio/lineaCredito';
import { CLIENTES } from '../../../infraestructura/demostracion/datos';
import { D } from '../../../shared/dominio/decimal';
import { diasEntre, establecerDia, isoFecha, parseFecha } from '../../../shared/dominio/fechas';

const f = parseFecha;

describe('regresión de redondeo y línea disponible',()=>{
 it('no devuelve cronogramas negativos ni sin cuota al explorar montos pequeños',()=>{
  for(let cent=1;cent<=100;cent++)for(let n=1;n<=12;n++){
   try {
    const r=generarCronogramaFrances({capital:D(cent).div(100),fechaCompra:f('2026-09-15'),diaCorte:20,diaPago:26,ted:D(0),tem:D(0),nMeses:n});
    expect(r.filas.every(x=>x.cuota.gte(0)&&x.amortizacion.gte(0)&&x.saldoFinal.gte(0))).toBe(true);
    expect(r.totalAmortizado.eq(r.capitalAjustado)).toBe(true);expect(r.cierra).toBe(true);
   } catch(e) { expect((e as Error).message).toContain('centavos'); }
  }
 });
 it('muestra cero disponible cuando la deuda supera el límite',()=>{
  expect(lineaDisponible(D(100),D(1200)).toFixed(2)).toBe('0.00');
  expect(compraPermitida(D(100),D(1200),D(1))).toBe(false);
 });
});

describe('tasas', () => {
  it('TNA c.d. 24 %: TED 0.0666667 %', () => expect(convertirTasas('Nominal', 24, 'Diaria').ted.mul(100).toFixed(7)).toBe('0.0666667'));
  it('TNA c.m. 24 %: TEM 2 %', () => expect(convertirTasas('Nominal', 24, 'Mensual').tem.toFixed(7)).toBe('0.0200000'));
  it('TEA 30 %: TED y TEM', () => {
    const t = convertirTasas('Efectiva', 30);
    expect(t.ted.mul(100).toFixed(7)).toBe('0.0729055');
    expect(t.tem.mul(100).toFixed(7)).toBe('2.2104451');
  });
});

describe('fechas y ciclo', () => {
  it('EstablecerDia satura febrero', () => {
    expect(isoFecha(establecerDia(2026, 2, 30))).toBe('2026-02-28');
    expect(isoFecha(establecerDia(2024, 2, 30))).toBe('2024-02-29');
  });
  it('días entre cruzando año', () => expect(diasEntre(f('2026-12-15'), f('2027-01-15'))).toBe(31));
  it('compra 05/10 con corte 20 y pago 26 vence 26/10 (ciclo actual)', () => {
    const c = resolverCiclo(f('2026-10-05'), 20, 26);
    expect(c.ciclo).toBe(0); expect(isoFecha(c.vencimiento)).toBe('2026-10-26'); expect(c.dias).toBe(21);
  });
  it('compra 25/09 tras el corte vence 26/10 (ciclo siguiente)', () => {
    const c = resolverCiclo(f('2026-09-25'), 20, 26);
    expect(c.ciclo).toBe(1); expect(isoFecha(c.vencimiento)).toBe('2026-10-26'); expect(c.dias).toBe(31);
  });
});

describe('prelación Art. 1257', () => {
  it('abono completo extingue todo', () => {
    const p = imputarPorPrelacion(D('1214.88'), D('2.02'), D('12.86'), D('1200'));
    expect([p.mora, p.comp, p.cap, p.saldo].map(String)).toEqual(['2.02', '12.86', '1200', '0']);
  });
  it('abono parcial paga mora, luego compensatorio', () => {
    const p = imputarPorPrelacion(D('10'), D('2.02'), D('12.86'), D('1200'));
    expect([p.mora, p.comp, p.cap, p.saldo].map(String)).toEqual(['2.02', '7.98', '0', '1204.88']);
  });
});

describe('juego de prueba 1: fin de mes con mora', () => {
  const t = convertirTasas('Nominal', 24, 'Diaria');
  const m = convertirTasas('Nominal', 15, 'Diaria');
  const r = liquidarFinDeMes({ capital: D(1200), fechaCompra: f('2026-09-10'), diaCorte: 20, diaPago: 26, tedComp: t.ted, tedMora: m.ted, fechaRealPago: f('2026-09-30') });
  it('16 días, compensatorio 12.86, monto 1212.86', () => {
    expect(r.dias).toBe(16); expect(r.interesComp.toFixed(2)).toBe('12.86'); expect(r.montoVencido.toFixed(2)).toBe('1212.86');
  });
  it('4 días de mora, 2.02, total 1214.88', () => {
    expect(r.diasMora).toBe(4); expect(r.interesMora.toFixed(2)).toBe('2.02'); expect(r.deudaTotal.toFixed(2)).toBe('1214.88');
  });
});

describe('juego de prueba 2: cuotas con gracia total', () => {
  const t = convertirTasas('Efectiva', 30);
  const c = generarCronogramaFrances({ capital: D(4500), fechaCompra: f('2026-09-15'), diaCorte: 20, diaPago: 26, ted: t.ted, tem: t.tem, nMeses: 3 });
  it('gracia 11 días, P_cap 4536.22, interés 36.22, R 1579.41', () => {
    expect(c.diasGracia).toBe(11); expect(c.capitalAjustado.toFixed(2)).toBe('4536.22');
    expect(c.interesGracia.toFixed(2)).toBe('36.22'); expect(c.cuotaFija.toFixed(2)).toBe('1579.41');
  });
  it('filas 1 a 3 coinciden con 6.d', () => {
    const v = c.filas.slice(1).map((x) => [x.saldoInicial, x.interes, x.amortizacion, x.saldoFinal].map((d) => d.toFixed(2)));
    expect(v).toEqual([['4536.22', '100.27', '1479.14', '3057.08'], ['3057.08', '67.58', '1511.83', '1545.25'], ['1545.25', '34.16', '1545.25', '0.00']]);
  });
  it('totales y cierre en 0.00', () => {
    expect(c.totalIntereses.toFixed(2)).toBe('238.23'); expect(c.totalCuotas.toFixed(2)).toBe('4738.23'); expect(c.cierra).toBe(true);
  });
});

describe('línea de crédito', () => {
  it('bloquea si deuda + compra supera el límite', () => {
    expect(compraPermitida(D(5000), D(0), D(1200))).toBe(true);
    expect(compraPermitida(D(3000), D(2480), D(530))).toBe(false);
  });
});


describe('datos exactos del informe 6.4', () => {
  it('TNA moratoria 15 % reproduce la liquidación y prelación del informe', () => {
    const r = liquidarFinDeMes({ capital: D(1200), fechaCompra: f('2026-09-10'), diaCorte: 20, diaPago: 26, tedComp: convertirTasas(CLIENTES[0].tipoC, CLIENTES[0].valC, CLIENTES[0].capC).ted, tedMora: convertirTasas(CLIENTES[0].tipoM, CLIENTES[0].valM, CLIENTES[0].capM).ted, fechaRealPago: f('2026-09-30') });
    expect([r.interesComp, r.interesMora, r.deudaTotal].map(x => x.toFixed(2))).toEqual(['12.86', '2.02', '1214.88']);
    const p = imputarPorPrelacion(r.deudaTotal, r.interesMora, r.interesComp, D(1200));
    expect(p.saldo.toFixed(2)).toBe('0.00');
  });
  it('la gracia cierra el 26/09 y la primera cuota vence el 26/10', () => {
    const t = convertirTasas('Efectiva', 30);
    const c = generarCronogramaFrances({ capital: D(4500), fechaCompra: f('2026-09-15'), diaCorte: 20, diaPago: 26, ted: t.ted, tem: t.tem, nMeses: 3 });
    expect(c.filas.map(x => isoFecha(x.fecha))).toEqual(['2026-09-26', '2026-10-26', '2026-11-26', '2026-12-26']);
  });
});
