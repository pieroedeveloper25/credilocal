import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { crearDatosDemo } from '../src/infraestructura/demostracion/crearDatosDemo';
import { abrirBase } from '../src/infraestructura/persistencia/sqlite';
import { exigir } from '../src/shared/dominio/validaciones';

export async function crearBaseDemo(destino = resolve('datos/demo.sqlite'), fecha?: string, recursos?: string) {
    const ruta = resolve(destino);
    exigir(ruta.endsWith('.sqlite'), 'Use un archivo de destino con extensión .sqlite.');
    exigir(!existsSync(ruta), 'El destino ya existe. Use otro archivo; no se sobrescribe ninguna base.');
    const { datos, resumen } = await crearDatosDemo(fecha, recursos);
    mkdirSync(dirname(ruta), { recursive: true });
    // Reserva exclusiva para impedir sobrescrituras incluso si se crean dos cargas a la vez.
    closeSync(openSync(ruta, 'wx'));
    const repositorio = abrirBase(ruta);
    try { repositorio.guardar(datos); } finally { repositorio.cerrar(); }
    const db = new DatabaseSync(ruta);
    try { db.prepare('INSERT INTO metadatos(clave,valor) VALUES (?,?)').run('demostracion', JSON.stringify(resumen)); }
    finally { db.close(); }
    return { ruta, ...resumen };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const args = process.argv.slice(2);
        exigir(args.length % 2 === 0 && args.every((x, i) => i % 2 !== 0 || ['--destino', '--fecha'].includes(x)),
            'Uso: npm run demo:crear -- --destino datos/demo.sqlite --fecha YYYY-MM-DD');
        const destino = args.includes('--destino') ? args[args.indexOf('--destino') + 1] : undefined;
        const fecha = args.includes('--fecha') ? args[args.indexOf('--fecha') + 1] : undefined;
        console.log(JSON.stringify(await crearBaseDemo(destino, fecha), null, 2));
        console.log('Base de demostración creada. Contraseña de los accesos ficticios: credi2026');
        console.log('Iniciar: npm run demo:iniciar');
    } catch (error) {
        console.error((error as Error).message);
        process.exitCode = 1;
    }
}
