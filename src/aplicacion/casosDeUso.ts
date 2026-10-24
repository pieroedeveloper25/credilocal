/** Composición de los contextos: conecta eventos entre ellos y expone los casos de uso que los publican. */
import { alAmortizarseCapital, alRegistrarseVentaCredito as consumirLinea } from '../contexts/customer-management/aplicacion/suscriptores';
import { alRegistrarseVentaCredito as crearObligacionesPactadas } from '../contexts/billing-and-collections/aplicacion/suscriptores';
import { registrarCompra as registrarCompraEnBC4 } from '../contexts/credit-origination/aplicacion/registrarVenta';
import { registrarCobranza as registrarCobranzaEnBC5 } from '../contexts/billing-and-collections/aplicacion/registrarPago';
import type { VentaCreditoRegistrada } from '../contexts/credit-origination/dominio/eventos';
import type { CapitalAmortizado } from '../contexts/billing-and-collections/dominio/eventos';
import { crearBusDeEventos } from '../shared/aplicacion/busDeEventos';
import type { Datos } from '../shared/dominio/datos';

const bus = crearBusDeEventos();
bus.suscribir<VentaCreditoRegistrada>('VentaCreditoRegistrada', crearObligacionesPactadas);
bus.suscribir<VentaCreditoRegistrada>('VentaCreditoRegistrada', consumirLinea);
bus.suscribir<CapitalAmortizado>('CapitalAmortizado', alAmortizarseCapital);

export const registrarCompra = (d: Datos, tiendaId: number, entrada: Parameters<typeof registrarCompraEnBC4>[2]) =>
    registrarCompraEnBC4(d, tiendaId, entrada, bus.publicar);
export const registrarCobranza = (d: Datos, tiendaId: number, pedido: Parameters<typeof registrarCobranzaEnBC5>[2]) =>
    registrarCobranzaEnBC5(d, tiendaId, pedido, bus.publicar);
