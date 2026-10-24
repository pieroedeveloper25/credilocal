/** Una única cola para lecturas, operaciones y cortes del mismo servicio. */
import type { RepositorioDatos } from './puertos';
export function crearUnidadDeTrabajo(repositorio: RepositorioDatos) {
    let cola: Promise<unknown> = Promise.resolve();
    function ejecutar<T>(operacion: () => T | Promise<T>): Promise<T> {
        const resultado = cola.catch(() => undefined).then(operacion);
        cola = resultado;
        return resultado;
    }
    return {
        repositorio,
        ejecutar,
        esperar: () => cola.catch(() => undefined),
    };
}
