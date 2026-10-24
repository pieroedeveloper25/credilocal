import type { Producto } from './modelos';
import { D } from '../../../shared/dominio/decimal';
import { decimalEntrada, exigir, texto } from '../../../shared/dominio/validaciones';
export function validarProducto(p: Producto) {
    texto(p.nombre, 1, 120, 'Nombre del producto');
    texto(p.descripcion, 1, 255, 'Descripción');
    texto(p.marca, 0, 50, 'Marca');
    texto(p.proveedor, 0, 100, 'Proveedor');
    texto(p.unidad, 1, 20, 'Unidad');
    exigir(['Ambas', 'Cuotas', 'Fin de mes'].includes(p.modalidad), 'Seleccione una modalidad válida.');
    exigir(decimalEntrada(p.contado, 10, 2) && decimalEntrada(p.credito, 10, 2), 'Los precios admiten hasta 10 enteros y dos decimales.');
    exigir(p.nombre.trim() && p.unidad.trim() && p.descripcion?.trim(), 'Complete nombre, descripción y unidad.');
    exigir(/^data:image\/(png|jpeg);base64,/.test(p.imagen ?? ''), 'Adjunte una imagen JPG o PNG.');
    const base64 = (p.imagen ?? '').split(',')[1] ?? '';
    exigir(base64.length > 0 && base64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64), 'Adjunte una imagen JPG o PNG válida.');
    const relleno = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    exigir(base64.length * 3 / 4 - relleno <= 2 * 1024 * 1024, 'La imagen supera 2 MB.');
    exigir(/^\d+(\.\d+)?$/.test(p.contado) && /^\d+(\.\d+)?$/.test(p.credito), 'Ingrese precios válidos.');
    exigir(D(p.contado).gt(0) && D(p.credito).gte(p.contado), 'El precio de crédito debe ser mayor o igual al precio contado, ambos positivos.');
}
