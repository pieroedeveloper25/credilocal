import { D, Decimal, convertirTasas, liquidarFinDeMes, parseFecha, resolverCiclo, type Liquidacion } from '../../dominio/credito/motor';
import type { Cliente, Compra, Venta } from '../../dominio/modelos';
import { COMPRAS } from '../demostracion/datos';
export interface Linea extends Compra {
    n: number;
    r: Liquidacion;
}
export interface LiquidacionCliente {
    lineas: Linea[];
    capital: Decimal;
    comp: Decimal;
    mora: Decimal;
    total: Decimal;
    vencimiento: Date;
    diasMora: number;
}
/** Compras a fin de mes del período 2026-09: las de demostración más las ventas registradas antes del corte. */
export function comprasDe(c: Cliente, ventas: Venta[], periodo = '2026-09'): Compra[] {
    const extra = ventas
        .filter((v) => v.clienteId === c.id && v.modalidad === 'Fin de mes' && periodoDe(c, v) === periodo)
        .map((v) => ({ fecha: v.fecha, hora: v.hora, horaCorte: v.horaCorte, detalle: v.detalle, capital: v.capital }));
    return [...(periodo === '2026-09' ? COMPRAS[c.id] ?? [] : []), ...extra];
}
export function periodoDe(c: Cliente, v: Venta): string {
    const fecha = resolverCiclo(parseFecha(v.fecha), c.diaCorte, c.diaPago, v.hora, v.horaCorte ?? c.horaCorte).vencimiento;
    return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}
/** Primer financiamiento en cuotas vigente del cliente, si tiene uno. */
export function ventaCuotasDe(c: Cliente, ventas: Venta[]): Venta | undefined {
    return ventas.find((v) => v.clienteId === c.id && v.modalidad === 'Cuotas');
}
export function liquidacionCliente(c: Cliente, compras: Compra[], fechaReal: Date): LiquidacionCliente {
    const t = convertirTasas(c.tipoC, c.valC, c.capC);
    const m = convertirTasas(c.tipoM, c.valM, c.capM);
    const lineas: Linea[] = [...compras]
        .sort((a, b) => `${a.fecha} ${a.hora ?? "00:00"}`.localeCompare(`${b.fecha} ${b.hora ?? "00:00"}`))
        .map((k, i) => ({
        ...k, n: i + 1,
        r: liquidarFinDeMes({ capital: D(k.capital), fechaCompra: parseFecha(k.fecha), hora: k.hora, horaCorte: k.horaCorte ?? c.horaCorte, diaCorte: c.diaCorte, diaPago: c.diaPago, tedComp: t.ted, tedMora: m.ted, fechaRealPago: fechaReal }),
    }));
    const sum = (f: (l: Linea) => Decimal) => lineas.reduce((a, l) => a.plus(f(l)), D(0));
    return {
        lineas, capital: sum((l) => D(l.capital)), comp: sum((l) => l.r.interesComp), mora: sum((l) => l.r.interesMora), total: sum((l) => l.r.deudaTotal),
        vencimiento: lineas[0]?.r.vencimiento ?? fechaReal, diasMora: lineas[0]?.r.diasMora ?? 0,
    };
}
