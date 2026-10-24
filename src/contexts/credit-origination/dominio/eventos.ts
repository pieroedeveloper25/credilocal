import type { EventoDeDominio } from '../../../shared/dominio/eventos';
import type { Obligacion } from '../../billing-and-collections/dominio/modelos';
import type { Venta } from './modelos';

/** BC 4 confirma una venta a crédito y entrega las obligaciones pactadas. */
export interface VentaCreditoRegistrada extends EventoDeDominio {
    readonly tipo: 'VentaCreditoRegistrada';
    readonly venta: Venta;
    readonly obligaciones: Obligacion[];
}
export const ventaCreditoRegistrada = (venta: Venta, obligaciones: Obligacion[]): VentaCreditoRegistrada =>
    ({ tipo: 'VentaCreditoRegistrada', venta, obligaciones });
