/** Punto de composición: conecta casos de uso con SQLite, seguridad y HTTP. */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBase } from '../src/infraestructura/persistencia/sqlite';
import { iniciales } from '../src/infraestructura/demostracion/iniciales';
import { normalizarFinanzas } from '../src/infraestructura/migracion/normalizarFinanzas';
import { crearServidor } from '../src/infraestructura/http/crearServidor';
import { emitirCortesPendientes } from '../src/contexts/billing-and-collections/aplicacion/emitirCorte';
import { crearCuenta } from '../src/contexts/identity-and-access/infraestructura/credenciales';
import { crearUnidadDeTrabajo } from '../src/shared/aplicacion/unidadDeTrabajo';
import { relojPeru } from '../src/shared/dominio/fechas';
export async function crearAplicacion(ruta = resolve('datos/credilocal.sqlite'), ahora: () => string = relojPeru) {
    const base = abrirBase(ruta);
    const trabajo = crearUnidadDeTrabajo(base);
    const datos = base.leer() ?? await iniciales();
    normalizarFinanzas(datos);
    emitirCortesPendientes(datos, ahora());
    base.guardar(datos);
    const servidor = crearServidor(trabajo, { crearCuenta }, ahora);
    const revisarCortes = () => trabajo.ejecutar(() => {
        const datos = base.leer()!;
        const cambios = emitirCortesPendientes(datos, ahora());
        if (cambios)
            base.guardar(datos);
        return cambios;
    });
    const reloj = setInterval(() => {
        void revisarCortes().catch(error => console.error('No se pudo guardar el corte:', error.message));
    }, 30000);
    reloj.unref();
    return {
        servidor,
        revisarCortes,
        cerrar: async () => {
            clearInterval(reloj);
            await trabajo.esperar();
            await new Promise<void>(resolver => servidor.close(() => resolver()));
            base.cerrar();
        },
    };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const app = await crearAplicacion(process.env.CREDILOCAL_DB ?? resolve('datos/credilocal.sqlite'));
    const puerto = Number(process.env.PORT ?? 3000);
    const host = process.env.HOST ?? '127.0.0.1';
    app.servidor.listen(puerto, host, () => console.log(`CrediLocal: http://${host}:${puerto}`));
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        process.once(signal, () => { void app.cerrar().then(() => process.exit(0)); });
    }
}
