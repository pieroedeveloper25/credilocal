import type { VentaCreditoRegistrada } from '../../credit-origination/dominio/eventos';
import type { CapitalAmortizado } from '../../billing-and-collections/dominio/eventos';
import type { Datos } from '../../../shared/dominio/datos';
import { D } from '../../../shared/dominio/decimal';
import { saldoComprometidoDe } from '../dominio/lineaCredito';

/** Una venta a crédito compromete su capital en la línea del cliente. */
export function alRegistrarseVentaCredito(evento: VentaCreditoRegistrada, datos: Datos) {
    const cliente = datos.clientes.find(c => c.id === evento.venta.clienteId && c.tiendaId === evento.venta.tiendaId);
    if (cliente)
        cliente.saldoComprometido = D(saldoComprometidoDe(cliente)).plus(evento.venta.capital).toFixed(2);
}

/** El cobranza informa el capital pendiente; la línea disponible se libera con él. */
export function alAmortizarseCapital(evento: CapitalAmortizado, datos: Datos) {
    const cliente = datos.clientes.find(c => c.id === evento.clienteId && c.tiendaId === evento.tiendaId);
    if (cliente)
        cliente.saldoComprometido = evento.saldoPendiente;
}
