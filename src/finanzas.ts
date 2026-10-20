/** Fachada de compatibilidad con las referencias del informe y la versión anterior. */
export type { Obligacion, DetallePago, LineaDeuda, ListadoCorte } from './dominio/modelos';
export { condicionesDe, fechaPagoPeriodo, crearObligaciones, deudaLinea, liquidarObligaciones } from './dominio/credito/obligaciones';
export { relojPeru } from './dominio/validaciones';
export { registrarCompra } from './aplicacion/credito/registrarVenta';
export { registrarCobranza } from './aplicacion/cobranza/registrarPago';
export { emitirCorte, emitirCortesPendientes } from './aplicacion/cortes/emitirCorte';
export { normalizarFinanzas } from './infraestructura/migracion/normalizarFinanzas';
