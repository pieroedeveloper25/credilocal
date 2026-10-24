/** La aplicación conoce este contrato; SQLite es una implementación intercambiable. */
import type { Cuenta, Rol } from '../../contexts/identity-and-access/dominio/modelos';
import type { Datos } from '../dominio/datos';
export interface RepositorioDatos {
    leer(): Datos | undefined;
    guardar(datos: Datos): void;
    cerrar(): void;
}
/** El caso de uso solicita una cuenta sin conocer PBKDF2 ni Web Crypto. */
export interface CreadorDeCuentas {
    crearCuenta(correo: string, clave: string, rol: Rol, id: number, tiendaId?: number, clienteId?: number): Promise<Cuenta>;
}
