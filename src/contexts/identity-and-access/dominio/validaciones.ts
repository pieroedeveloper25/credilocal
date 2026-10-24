import type { Tienda } from './modelos';
import type { Datos } from '../../../shared/dominio/datos';
import { correoValido, exigir, telefono, texto } from '../../../shared/dominio/validaciones';
export function validarTienda(t: Tienda, datos: Datos) {
    exigir(/^\d{11}$/.test(t.ruc), 'El RUC debe tener 11 dígitos.');
    exigir(!datos.tiendas.some(x => x.id !== t.id && x.ruc === t.ruc), 'El RUC ya está registrado.');
    exigir(t.razon.trim() && t.nombre.trim() && t.giro.trim() && t.direccion.trim(), 'Complete razón social, nombre, giro y dirección.');
    texto(t.razon, 1, 150, 'Razón social');
    texto(t.nombre, 1, 100, 'Nombre comercial');
    texto(t.giro, 1, 50, 'Giro');
    texto(t.direccion, 1, 200, 'Dirección');
    telefono(t.telefono);
    texto(t.correo, 5, 100, 'Correo');
    exigir(correoValido(t.correo), 'Ingrese un correo válido para el administrador.');
}
