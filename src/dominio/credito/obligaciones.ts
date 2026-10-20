import type { Cliente, Condiciones, Venta, Datos, Obligacion, LineaDeuda } from '../modelos';
import { exigir } from '../validaciones';
import { D, r2, convertirTasas, generarCronogramaFrances, liquidarFinDeMes, parseFecha, establecerDia, isoFecha, fechaValida, diasEntre } from './motor';
export function condicionesDe(c: Cliente): Condiciones {
    return { moneda: c.moneda, diaCorte: c.diaCorte, diaPago: c.diaPago, horaCorte: c.horaCorte ?? '23:59', tipoC: c.tipoC, valC: c.valC, capC: c.capC, tipoM: c.tipoM, valM: c.valM, capM: c.capM };
}
export function fechaPagoPeriodo(periodo: string, dia: number) {
    exigir(/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo), 'Seleccione un período válido.');
    const [y, m] = periodo.split('-').map(Number);
    return isoFecha(establecerDia(y, m, dia));
}
export function corteDelPeriodo(d: Pick<Datos, 'obligaciones'>, c: Cliente, periodo: string) {
    const cortes = (d.obligaciones ?? []).filter(o => o.clienteId === c.id && o.tiendaId === c.tiendaId && o.vencimiento.slice(0, 7) === periodo).map(o => o.corteAsignado).sort();
    return cortes[cortes.length - 1] ?? `${fechaPagoPeriodo(periodo, c.diaCorte)}T${c.horaCorte ?? '23:59'}`;
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
export function deudaLinea(d: Datos, c: Cliente) {
    // La gracia capitalizada forma parte del cronograma, pero no consume línea adicional.
    return r2(d.ventas.filter(v => v.clienteId === c.id && v.tiendaId === c.tiendaId).reduce((total, v) => {
        const obs = (d.obligaciones ?? []).filter(o => o.ventaId === v.id);
        const pendiente = obs.filter(o => !o.pagada).reduce((a, o) => a.plus(o.capital), D(0));
        const base = obs.reduce((a, o) => a.plus(o.capital), D(0));
        return total.plus(base.gt(0) ? D(v.capital).mul(pendiente).div(base) : 0);
    }, D(0)));
}
export function liquidarObligaciones(d: Pick<Datos, 'obligaciones'>, c: Cliente, periodo: string, fechaReal: string, alCorte?: string) {
    exigir(fechaValida(fechaReal), 'Ingrese una fecha real válida.');
    const fechas = (d.obligaciones ?? []).filter(o => o.clienteId === c.id && o.tiendaId === c.tiendaId && o.vencimiento.slice(0, 7) === periodo).map(o => o.vencimiento).sort();
    const prevista = fechas[fechas.length - 1] ?? fechaPagoPeriodo(periodo, c.diaPago);
    const limite = fechaReal > prevista ? fechaReal : prevista;
    const lineas: LineaDeuda[] = (d.obligaciones ?? []).filter(o => o.clienteId === c.id && o.tiendaId === c.tiendaId && o.vencimiento <= limite &&
        (alCorte ? o.corteAsignado <= alCorte && (!o.pagada || !!o.fechaPago && `${o.fechaPago}T${o.horaPago ?? '23:59'}` > alCorte) : !o.pagada))
        .sort((a, b) => `${a.fechaCompra}T${a.hora}:${a.id}`.localeCompare(`${b.fechaCompra}T${b.hora}:${b.id}`)).map(o => {
        exigir(fechaReal >= o.fechaCompra, 'La fecha de pago no puede ser anterior a la compra.');
        const diasMora = Math.max(0, diasEntre(parseFecha(o.vencimiento), parseFecha(fechaReal)));
        const mora = r2(D(o.capital).plus(o.comp).mul(D(1).plus(o.tedMora).pow(diasMora).minus(1)));
        return { ...o, mora: mora.toFixed(2), total: D(o.capital).plus(o.comp).plus(mora).toFixed(2), dias: diasEntre(parseFecha(o.fechaCompra), parseFecha(o.vencimiento)), diasMora };
    });
    const sum = (f: 'capital' | 'comp' | 'mora') => lineas.reduce((a, l) => a.plus(l[f]), D(0));
    const capital = sum('capital'), comp = sum('comp'), mora = sum('mora');
    return { lineas, capital, comp, mora, total: capital.plus(comp).plus(mora), vencimiento: parseFecha(prevista), diasMora: Math.max(0, ...lineas.map(l => l.diasMora)) };
}
export function contextoListado(o: Obligacion, concepto: string, fecha: string) {
    const esMora = concepto === 'Interés por mora', esCapital = concepto.startsWith('Capital');
    return { vencimiento: o.vencimiento, dias: esMora ? Math.max(0, diasEntre(parseFecha(o.vencimiento), parseFecha(fecha))) : o.cuota ? 30 : diasEntre(parseFecha(o.fechaCompra), parseFecha(o.vencimiento)), tasa: esCapital ? '' : esMora ? o.tedMora : o.cuota ? (o.temComp ?? '') : (o.tedComp ?? ''), baseTasa: esCapital ? '' : esMora ? 'TED mora' : o.cuota ? 'TEM' : 'TED' };
}
