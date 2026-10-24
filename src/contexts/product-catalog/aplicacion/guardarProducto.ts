import type { Sesion } from '../../identity-and-access/dominio/modelos';
import type { Producto } from '../dominio/modelos';
import { validarProducto } from '../dominio/validaciones';
import type { Datos } from '../../../shared/dominio/datos';
export function guardarProducto(datos: Datos, sesion: Sesion, registro: Producto) {
    const previa = datos.productos.find(producto => producto.sku === registro.sku && producto.tiendaId === sesion.tiendaId);
    const nuevo = { ...registro, tiendaId: sesion.tiendaId };
    validarProducto(nuevo);
    if (previa)
        datos.productos = datos.productos.map(producto => producto === previa ? nuevo : producto);
    else
        datos.productos.push(nuevo);
}
