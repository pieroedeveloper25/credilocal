import { IMAGEN_PREDETERMINADA } from './imagenPredeterminada';
import type { Compra } from '../../contexts/credit-origination/dominio/modelos';
import type { Cliente } from '../../contexts/customer-management/dominio/modelos';
import type { Producto } from '../../contexts/product-catalog/dominio/modelos';
export const CLIENTES: Cliente[] = [
    { id: 0, nombre: 'Taller Mecánico San Cristóbal E.I.R.L.', tipoDoc: 'RUC', doc: '20601234567', limite: '5000', deuda: '0', diaCorte: 20, diaPago: 26, plazo: 6, moneda: 'PEN', tipoC: 'Nominal', valC: '24', capC: 'Diaria', tipoM: 'Nominal', valM: '15', capM: 'Diaria' },
    { id: 1, nombre: 'Transportes & Servicios Integrales SAC', tipoDoc: 'RUC', doc: '20551122334', limite: '10000', deuda: '0', diaCorte: 20, diaPago: 26, plazo: 6, moneda: 'PEN', tipoC: 'Efectiva', valC: '30', capC: 'Diaria', tipoM: 'Nominal', valM: '36', capM: 'Diaria' },
    { id: 2, nombre: 'Autopartes Rímac', tipoDoc: 'DNI', doc: '42817350', limite: '3000', deuda: '2480', diaCorte: 15, diaPago: 25, plazo: 3, moneda: 'PEN', tipoC: 'Efectiva', valC: '28', capC: 'Diaria', tipoM: 'Efectiva', valM: '40', capM: 'Diaria' },
];
/** Compras a fin de mes de septiembre 2026 (antes del corte de cada cliente). */
export const COMPRAS: Record<number, Compra[]> = {
    0: [{ fecha: '2026-09-10', detalle: 'Tambor de aceite sintético 5W-30 + filtros', capital: '1200' }],
    1: [{ fecha: '2026-09-03', detalle: 'Neumáticos de flota (2 unidades)', capital: '1640' }, { fecha: '2026-09-18', detalle: 'Alineamiento y balanceo', capital: '240' }],
    2: [{ fecha: '2026-09-02', detalle: 'Pastillas y discos de freno', capital: '1950' }, { fecha: '2026-09-12', detalle: 'Batería 12 V', capital: '530' }],
};
export const PRODUCTOS: Producto[] = [
    { sku: 'KIT-001', nombre: 'Tambor aceite sintético 5W-30 + filtros', unidad: 'KIT', marca: 'Castrol', contado: '1100', credito: '1200', modalidad: 'Ambas', imagen: IMAGEN_PREDETERMINADA },
    { sku: 'SRV-014', nombre: 'Overhaul completo de motor diésel', unidad: 'SERVICIO', marca: '—', contado: '4200', credito: '4500', modalidad: 'Cuotas', imagen: IMAGEN_PREDETERMINADA },
    { sku: 'ACE-002', nombre: 'Aceite mineral 20W-50', unidad: 'GALON', marca: 'Mobil', contado: '62', credito: '68', modalidad: 'Fin de mes', imagen: IMAGEN_PREDETERMINADA },
    { sku: 'FIL-021', nombre: 'Filtro de aceite reforzado', unidad: 'UNIDAD', marca: 'Bosch', contado: '34', credito: '38', modalidad: 'Fin de mes', imagen: IMAGEN_PREDETERMINADA },
    { sku: 'FRE-030', nombre: 'Pastillas y discos de freno (eje delantero)', unidad: 'KIT', marca: 'Brembo', contado: '1820', credito: '1950', modalidad: 'Ambas', imagen: IMAGEN_PREDETERMINADA },
    { sku: 'BAT-012', nombre: 'Batería 12 V 65 Ah', unidad: 'UNIDAD', marca: 'Bosch', contado: '490', credito: '530', modalidad: 'Ambas', imagen: IMAGEN_PREDETERMINADA },
    { sku: 'SRV-020', nombre: 'Alineamiento y balanceo', unidad: 'SERVICIO', marca: '—', contado: '210', credito: '240', modalidad: 'Fin de mes', imagen: IMAGEN_PREDETERMINADA },
    { sku: 'LIQ-005', nombre: 'Refrigerante concentrado', unidad: 'LITRO', marca: 'Prestone', contado: '24', credito: '27', modalidad: 'Fin de mes', imagen: IMAGEN_PREDETERMINADA },
];
