import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { crearAplicacion } from '../servidor-dist/main.mjs';

const ruta = resolve(process.argv[2] ?? 'datos/demo.sqlite');
if (!existsSync(ruta)) {
    console.error('Primero ejecute npm run demo:crear. Para otra base: npm run demo:iniciar -- datos/otra.sqlite');
    process.exitCode = 1;
} else {
    const lectura = new DatabaseSync(ruta, { readOnly: true });
    let demostracion;
    try { demostracion = lectura.prepare("SELECT valor FROM metadatos WHERE clave='demostracion'").get(); }
    finally { lectura.close(); }
    if (!demostracion) {
        console.error('El archivo no es una base de demostración creada con demo:crear. La base no se modificó.');
        process.exit(1);
    }
    const app = await crearAplicacion(ruta);
    const puerto = Number(process.env.PORT ?? 3000), host = process.env.HOST ?? '127.0.0.1';
    app.servidor.listen(puerto, host, () => console.log(`CrediLocal demo: http://${host}:${puerto}\nBase: ${ruta}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.cerrar().then(() => process.exit(0)); });
}
