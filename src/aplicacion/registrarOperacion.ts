import type { Datos, Sesion } from '../dominio/modelos';
import { ejecutarOperacion, type Operacion } from './ejecutarOperacion';
import { emitirCortesPendientes } from './cortes/emitirCorte';
import type { CreadorDeCuentas, RepositorioDatos } from './puertos';
/** Se invoca dentro de la unidad de trabajo. Solo guarda tras completar el caso de uso. */
export async function registrarOperacion(datos: Datos, sesion: Sesion, operacion: Operacion, cuentas: CreadorDeCuentas, repositorio: RepositorioDatos, ahora: () => string) {
    const resultado = await ejecutarOperacion(datos, sesion, operacion, cuentas);
    datos.auditoria.push({ fecha: new Date().toISOString(), actor: sesion.correo, accion: operacion.accion });
    emitirCortesPendientes(datos, ahora());
    repositorio.guardar(datos);
    return resultado;
}
