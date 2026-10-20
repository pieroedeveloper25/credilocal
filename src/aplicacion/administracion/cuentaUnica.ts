import type { Datos, Rol } from '../../dominio/modelos';
import { exigir, normalizarCorreo } from '../../dominio/validaciones';
export function exigirCuentaUnica(datos: Datos, correo: string, rol: Rol, tiendaId?: number, clienteId?: number) {
    exigir(!datos.cuentas.some(cuenta => cuenta.correo === normalizarCorreo(correo) &&
        !(cuenta.rol === rol && cuenta.tiendaId === tiendaId && cuenta.clienteId === clienteId)), 'Este correo ya pertenece a otra cuenta.');
}
