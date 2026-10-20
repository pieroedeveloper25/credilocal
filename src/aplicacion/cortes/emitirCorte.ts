import type { Datos, ListadoCorte } from '../../dominio/modelos';
import { exigir, relojPeru } from '../../dominio/validaciones';
import { D, isoFecha } from '../../dominio/credito/motor';
import { corteDelPeriodo, liquidarObligaciones, contextoListado } from '../../dominio/credito/obligaciones';
export function emitirCorte(d: Datos, tiendaId: number, clienteId: number, periodo: string, ahora = relojPeru()) {
    const c = d.clientes.find(c => c.id === clienteId && c.tiendaId === tiendaId);
    exigir(c, 'Cliente ajeno a la tienda.');
    const corte = corteDelPeriodo(d, c, periodo);
    exigir(ahora >= corte, 'El corte todavía no ha llegado. Puede consultar la proyección.');
    // Las compras todavía por vencer no generan mora futura al emitir el corte.
    const l = liquidarObligaciones(d, c, periodo, corte.slice(0, 10), corte);
    const lineas: ListadoCorte['lineas'] = [];
    for (const o of l.lineas) {
        const base = { obligacionId: o.id, fechaCompra: o.fechaCompra, detalle: o.detalle };
        lineas.push({ ...base, concepto: o.cuota ? `Capital cuota ${o.cuota}` : 'Capital', importe: o.capital }, { ...base, concepto: 'Interés compensatorio', importe: o.comp });
        if (D(o.mora).gt(0))
            lineas.push({ ...base, concepto: 'Interés por mora', importe: o.mora });
    }
    for (const fila of lineas) {
        const o = l.lineas.find(o => o.id === fila.obligacionId)!;
        Object.assign(fila, contextoListado(o, fila.concepto, corte.slice(0, 10)));
    }
    const monedas = [...new Set(l.lineas.map(o => o.moneda))];
    exigir(monedas.length <= 1, 'El corte reúne operaciones de distintas monedas. Mantenga una moneda por cuenta.');
    const anterior = d.listados?.find(x => x.id === `${tiendaId}:${clienteId}:${periodo}`);
    const moneda = monedas[0] ?? anterior?.moneda ?? (d.ventas.filter(v => v.clienteId === clienteId && v.tiendaId === tiendaId && v.fecha.slice(0, 7) <= periodo).sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.condiciones?.moneda) ?? c.moneda;
    const listado: ListadoCorte = { id: `${tiendaId}:${clienteId}:${periodo}`, clienteId, tiendaId, periodo, corte, fechaPago: isoFecha(l.vencimiento), moneda, lineas, capital: l.capital.toFixed(2), comp: l.comp.toFixed(2), mora: l.mora.toFixed(2), total: l.total.toFixed(2) };
    d.listados ??= [];
    const pos = d.listados.findIndex(x => x.id === listado.id);
    if (pos < 0)
        d.listados.push(listado);
    else
        d.listados[pos] = listado;
    return listado;
}
/** Recupera y actualiza cortes; el servidor decide cuándo invocar este caso de uso. */
export function emitirCortesPendientes(d: Datos, ahora = relojPeru()) {
    let cambios = 0;
    for (const c of d.clientes) {
        const obs = (d.obligaciones ?? []).filter(o => o.clienteId === c.id && o.tiendaId === c.tiendaId);
        if (!obs.length)
            continue;
        const inicio = obs.map(o => o.corteAsignado.slice(0, 7)).sort()[0];
        const [iy, im] = inicio.split('-').map(Number);
        for (let y = iy, m = im; `${y}-${String(m).padStart(2, '0')}` <= ahora.slice(0, 7); m === 12 ? (y++, m = 1) : m++) {
            const periodo = `${y}-${String(m).padStart(2, '0')}`;
            const corte = corteDelPeriodo(d, c, periodo);
            if (corte > ahora)
                break;
            const id = `${c.tiendaId}:${c.id}:${periodo}`;
            const anterior = JSON.stringify((d.listados ?? []).find(l => l.id === id));
            const actualizado = emitirCorte(d, c.tiendaId!, c.id, periodo, ahora);
            if (anterior !== JSON.stringify(actualizado)) {
                cambios++;
                d.auditoria.push({ fecha: ahora, actor: 'Sistema', accion: `EMITIR CORTE ${id}` });
            }
        }
    }
    return cambios;
}
