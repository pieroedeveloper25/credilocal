import type { Rol } from '../../contexts/identity-and-access/dominio/modelos';
import type { Datos } from './datos';
import { exigir, normalizarCorreo } from './validaciones';
export function exigirCuentaUnica(datos: Datos, correo: string, rol: Rol, tiendaId?: number, clienteId?: number) {
    exigir(!datos.cuentas.some(cuenta => cuenta.correo === normalizarCorreo(correo) &&
        !(cuenta.rol === rol && cuenta.tiendaId === tiendaId && cuenta.clienteId === clienteId)), 'Este correo ya pertenece a otra cuenta.');
}
