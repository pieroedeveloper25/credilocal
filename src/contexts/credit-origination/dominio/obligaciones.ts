import type { Obligacion } from '../../billing-and-collections/dominio/modelos';
import type { Condiciones, Venta } from './modelos';
import { convertirTasas, generarCronogramaFrances, liquidarFinDeMes } from './motor';
import type { Cliente } from '../../customer-management/dominio/modelos';
import { D, r2 } from '../../../shared/dominio/decimal';
import { fechaPagoPeriodo, isoFecha, parseFecha } from '../../../shared/dominio/fechas';
export function condicionesDe(c: Cliente): Condiciones {
    return { moneda: c.moneda, diaCorte: c.diaCorte, diaPago: c.diaPago, horaCorte: c.horaCorte ?? '23:59', tipoC: c.tipoC, valC: c.valC, capC: c.capC, tipoM: c.tipoM, valM: c.valM, capM: c.capM };
}

export function crearObligaciones(v: Venta, c: Cliente): Obligacion[] {
    const a = v.condiciones ?? condicionesDe(c);
    v.condiciones = a;
    const t = convertirTasas(a.tipoC, a.valC, a.capC), m = convertirTasas(a.tipoM, a.valM, a.capM);
    const fc = parseFecha(v.fecha);
    const common = { tiendaId: v.tiendaId ?? c.tiendaId ?? 1, clienteId: c.id, ventaId: v.id, modalidad: v.modalidad, fechaCompra: v.fecha, hora: v.hora ?? '00:00', detalle: v.detalle, tedComp: t.ted.toString(), temComp: t.tem.toString(), tedMora: m.ted.toString(), moneda: a.moneda };
    if (v.modalidad === 'Fin de mes') {
        const liq = liquidarFinDeMes({ capital: D(v.capital), fechaCompra: fc, diaCorte: a.diaCorte, diaPago: a.diaPago, hora: v.hora, horaCorte: a.horaCorte, tedComp: t.ted, tedMora: m.ted, fechaRealPago: fc });
        const vence = isoFecha(liq.vencimiento);
        return [{ ...common, id: `V${v.id}:0`, cuota: 0, vencimiento: vence, corteAsignado: `${fechaPagoPeriodo(vence.slice(0, 7), a.diaCorte)}T${a.horaCorte}`, capital: r2(D(v.capital)).toFixed(2), comp: liq.interesComp.toFixed(2) }];
    }
    const plan = generarCronogramaFrances({ capital: D(v.capital), fechaCompra: fc, hora: v.hora, horaCorte: a.horaCorte, diaCorte: a.diaCorte, diaPago: a.diaPago, ted: t.ted, tem: t.tem, nMeses: v.n });
    v.plan = { diasGracia: plan.diasGracia, capitalAjustado: plan.capitalAjustado.toFixed(2), cuotaFija: plan.cuotaFija.toFixed(2), totalIntereses: plan.totalIntereses.toFixed(2), totalCuotas: plan.totalCuotas.toFixed(2) };
    return plan.filas.slice(1).map(f => {
        const vence = isoFecha(f.fecha);
        return { ...common, id: `V${v.id}:${f.k}`, cuota: f.k, vencimiento: vence, corteAsignado: `${fechaPagoPeriodo(vence.slice(0, 7), a.diaCorte)}T${a.horaCorte}`, capital: f.amortizacion.toFixed(2), comp: f.interes.toFixed(2) };
    });
}
