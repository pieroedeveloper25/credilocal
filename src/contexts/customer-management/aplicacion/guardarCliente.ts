import { saldoComprometidoDe } from '../dominio/lineaCredito';
import type { Cliente } from '../dominio/modelos';
import { validarCliente } from '../dominio/validaciones';
import type { Sesion } from '../../identity-and-access/dominio/modelos';
import type { CreadorDeCuentas } from '../../../shared/aplicacion/puertos';
import { exigirCuentaUnica } from '../../../shared/dominio/cuentaUnica';
import type { Datos } from '../../../shared/dominio/datos';
import { D } from '../../../shared/dominio/decimal';
import { relojPeru } from '../../../shared/dominio/fechas';
import { exigir, normalizarCorreo, siguienteId } from '../../../shared/dominio/validaciones';
export async function guardarCliente(datos: Datos, sesion: Sesion, registro: Cliente, clave: string | undefined, cuentas: CreadorDeCuentas) {
    const id = registro.id < 0 ? siguienteId(datos.clientes) : registro.id;
    const previa = datos.clientes.find(cliente => cliente.id === id);
    exigir(!previa || previa.tiendaId === sesion.tiendaId, 'El cliente no pertenece a la tienda.');
    exigir(!previa || previa.moneda === registro.moneda || D(saldoComprometidoDe(previa)).isZero(), 'No cambie la moneda mientras existan obligaciones pendientes.');
    exigir(!previa || previa.moneda === registro.moneda ||
        !datos.ventas.some(venta => venta.clienteId === id && venta.fecha.slice(0, 7) === relojPeru().slice(0, 7)), 'Cambie la moneda a partir de un mes sin operaciones previas para no mezclar monedas en el corte.');
    const nueva = { ...registro, id, tiendaId: sesion.tiendaId, saldoComprometido: previa?.saldoComprometido ?? '0.00', correo: normalizarCorreo(registro.correo ?? '') };
    validarCliente(nueva, datos.clientes.filter(cliente => cliente.tiendaId === nueva.tiendaId));
    const cuenta = datos.cuentas.find(cuenta => cuenta.rol === 'Cliente' && cuenta.clienteId === id);
    if (nueva.correo) {
        exigirCuentaUnica(datos, nueva.correo, 'Cliente', nueva.tiendaId, id);
        if (!cuenta) {
            exigir(clave, 'Ingrese la contraseña inicial para el acceso del cliente.');
            datos.cuentas.push(await cuentas.crearCuenta(nueva.correo, clave, 'Cliente', siguienteId(datos.cuentas), nueva.tiendaId, id));
        }
        else {
            datos.cuentas = datos.cuentas.map(actual => actual.id === cuenta.id ? { ...actual, correo: nueva.correo } : actual);
        }
    }
    else {
        datos.cuentas = datos.cuentas.filter(cuenta => !(cuenta.rol === 'Cliente' && cuenta.clienteId === id));
    }
    if (previa)
        datos.clientes = datos.clientes.map(cliente => cliente.id === id ? nueva : cliente);
    else
        datos.clientes.push(nueva);
}
