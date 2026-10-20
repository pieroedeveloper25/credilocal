import { IMAGEN_PREDETERMINADA } from '../demostracion/imagenPredeterminada';
import { COMPRAS } from '../demostracion/datos';
import type { Datos } from '../../dominio/modelos';
import { crearObligaciones, condicionesDe, contextoListado } from '../../dominio/credito/obligaciones';
import { convertirTasas } from '../../dominio/credito/motor';
/** Migración única de la demostración anterior, conservando ventas y pagos existentes. */
export function normalizarFinanzas(d: Datos) {
    for (const p of d.productos)
        if (!p.imagen)
            p.imagen = IMAGEN_PREDETERMINADA;
    d.obligaciones ??= [];
    d.listados ??= [];
    if (!d.finanzasVersion) {
        for (const c of d.clientes.filter(c => c.tiendaId === 1)) {
            (COMPRAS[c.id] ?? []).forEach((x, i) => {
                const id = -1000 - c.id * 10 - i;
                if (!d.ventas.some(v => v.id === id))
                    d.ventas.push({ id, tiendaId: 1, clienteId: c.id, ...x, hora: x.hora ?? '00:00', modalidad: 'Fin de mes', n: 1 });
            });
        }
        d.finanzasVersion = 1;
    }
    for (const v of d.ventas) {
        const c = d.clientes.find(c => c.id === v.clienteId && c.tiendaId === v.tiendaId);
        if (!c || d.obligaciones.some(o => o.ventaId === v.id))
            continue;
        d.obligaciones.push(...crearObligaciones(v, c));
    }
    for (const p of d.pagos.filter(p => !p.detalles)) {
        for (const o of d.obligaciones.filter(o => o.clienteId === p.clienteId && o.modalidad === 'Fin de mes' && o.vencimiento.slice(0, 7) === (p.periodo ?? '2026-09'))) {
            o.pagada = p.constancia;
            o.fechaPago = p.fecha;
        }
    }
    for (const o of d.obligaciones) {
        const v = d.ventas.find(v => v.id === o.ventaId), c = d.clientes.find(c => c.id === o.clienteId);
        if (!o.tedComp && (v?.condiciones || c)) {
            const a = v?.condiciones ?? condicionesDe(c!);
            const t = convertirTasas(a.tipoC, a.valC, a.capC);
            o.tedComp = t.ted.toString();
            o.temComp = t.tem.toString();
        }
    }
    for (const l of d.listados)
        for (const fila of l.lineas) {
            const o = d.obligaciones.find(o => o.id === fila.obligacionId);
            if (o && fila.dias === undefined)
                Object.assign(fila, contextoListado(o, fila.concepto, l.corte.slice(0, 10)));
        }
    return d;
}
