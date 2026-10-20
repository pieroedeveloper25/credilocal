import type { Datos, Producto, Sesion } from '../../dominio/modelos';
import { validarProducto } from '../../dominio/validaciones';
export function guardarProducto(datos: Datos, sesion: Sesion, registro: Producto) {
    const previa = datos.productos.find(producto => producto.sku === registro.sku && producto.tiendaId === sesion.tiendaId);
    const nuevo = { ...registro, tiendaId: sesion.tiendaId };
    validarProducto(nuevo);
    if (previa)
        datos.productos = datos.productos.map(producto => producto === previa ? nuevo : producto);
    else
        datos.productos.push(nuevo);
}
