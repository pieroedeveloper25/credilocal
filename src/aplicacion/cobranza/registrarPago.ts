import type { Datos, Pago } from '../../dominio/modelos';
import { exigir, decimalEntrada, relojPeru } from '../../dominio/validaciones';
import { D, fechaValida, imputarPorPrelacion } from '../../dominio/credito/motor';
import { liquidarObligaciones } from '../../dominio/credito/obligaciones';
export function registrarCobranza(d: Datos, tiendaId: number, pedido: {
    clienteId: number;
    periodo: string;
    fecha: string;
    hora?: string;
    abono: string;
}): Pago {
    const c = d.clientes.find(c => c.id === pedido.clienteId && c.tiendaId === tiendaId);
    exigir(c, 'Cliente ajeno a la tienda.');
    exigir(fechaValida(pedido.fecha) && pedido.fecha <= relojPeru().slice(0, 10), 'No se puede registrar un pago con fecha futura o inválida.');
    exigir(decimalEntrada(pedido.abono, 10, 2), 'Ingrese un abono válido con hasta dos decimales.');
    const ahora = relojPeru();
    const hora = pedido.hora ?? (pedido.fecha === ahora.slice(0, 10) ? ahora.slice(11, 16) : '23:59');
    exigir(/^([01]\d|2[0-3]):[0-5]\d$/.test(hora) && `${pedido.fecha}T${hora}` <= ahora, 'Ingrese una hora real de pago válida y no futura.');
    const l = liquidarObligaciones(d, c, pedido.periodo, pedido.fecha);
    exigir(l.lineas.every(o => `${o.fechaCompra}T${o.hora}` <= `${pedido.fecha}T${hora}`), 'El pago no puede preceder a la compra.');
    exigir(l.total.gt(0), 'No existen obligaciones pendientes para este pago.');
    exigir(D(pedido.abono).eq(l.total), 'El abono debe coincidir con toda la deuda exigible. No se admiten pagos parciales ni excedentes.');
    exigir(l.lineas.every(o => o.moneda === c.moneda), 'Las obligaciones tienen otra moneda. Mantenga la moneda pactada.');
    const pr = imputarPorPrelacion(D(pedido.abono), l.mora, l.comp, l.capital);
    const constancia = `CP-${tiendaId}-${d.pagos.length + 1}-${pedido.clienteId}`;
    const p: Pago = { ...pedido, hora, tiendaId, constancia, capital: pr.cap.toFixed(2), comp: pr.comp.toFixed(2), mora: pr.mora.toFixed(2), moneda: c.moneda, detalles: l.lineas.map(o => ({ obligacionId: o.id, capital: o.capital, comp: o.comp, mora: o.mora })) };
    for (const o of d.obligaciones ?? [])
        if (l.lineas.some(l => l.id === o.id)) {
            o.pagada = constancia;
            o.fechaPago = pedido.fecha;
            o.horaPago = hora;
        }
    d.pagos.push(p);
    return p;
}
