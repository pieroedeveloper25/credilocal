import type { Datos, Tienda } from '../../dominio/modelos';
import { exigir, normalizarCorreo, siguienteId, validarTienda } from '../../dominio/validaciones';
import type { CreadorDeCuentas } from '../puertos';
import { exigirCuentaUnica } from './cuentaUnica';
export async function guardarTienda(datos: Datos, registro: Tienda, clave: string | undefined, cuentas: CreadorDeCuentas) {
    const id = registro.id < 0 ? Math.max(0, ...datos.tiendas.map(tienda => tienda.id)) + 1 : registro.id;
    const previa = datos.tiendas.find(tienda => tienda.id === id);
    const nueva = { ...registro, id, correo: normalizarCorreo(registro.correo) };
    validarTienda(nueva, datos);
    exigirCuentaUnica(datos, nueva.correo, 'Comercio', id);
    if (!previa) {
        exigir(clave, 'Ingrese la contraseña inicial.');
        datos.cuentas.push(await cuentas.crearCuenta(nueva.correo, clave, 'Comercio', siguienteId(datos.cuentas), id));
        datos.tiendas.push(nueva);
        return;
    }
    datos.tiendas = datos.tiendas.map(tienda => tienda.id === id ? nueva : tienda);
    datos.cuentas = datos.cuentas.map(cuenta => cuenta.rol === 'Comercio' && cuenta.tiendaId === id
        ? { ...cuenta, correo: nueva.correo } : cuenta);
}
