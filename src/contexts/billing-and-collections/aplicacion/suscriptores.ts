import type { VentaCreditoRegistrada } from '../../credit-origination/dominio/eventos';
import type { Datos } from '../../../shared/dominio/datos';

/** Las obligaciones pactadas por la venta pasan a ser deuda gestionada por cobranzas. */
export function alRegistrarseVentaCredito(evento: VentaCreditoRegistrada, datos: Datos) {
    (datos.obligaciones ??= []).push(...evento.obligaciones);
}
