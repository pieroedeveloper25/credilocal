/** Fachada de compatibilidad; los casos de uso están en src/aplicacion. */
import type { Datos, Sesion } from '../src/dominio/modelos';
import { ejecutarOperacion, type Operacion } from '../src/aplicacion/ejecutarOperacion';
import { crearCuenta } from '../src/infraestructura/seguridad/credenciales';
export const operar = (datos: Datos, sesion: Sesion, accion: string, pedido: unknown) => ejecutarOperacion(datos, sesion, { accion, pedido } as Operacion, { crearCuenta });
