import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RepositorioDatos } from '../../shared/aplicacion/puertos';
import type { Datos } from '../../shared/dominio/datos';
const listas = ['tiendas', 'cuentas', 'clientes', 'productos', 'ventas', 'obligaciones', 'listados', 'pagos', 'auditoria'] as const;
/** Cada colección lógica se conserva en una tabla, con sus objetos decimales intactos. */
export function abrirBase(ruta: string): RepositorioDatos {
    if (ruta !== ':memory:')
        mkdirSync(dirname(ruta), { recursive: true });
    const db = new DatabaseSync(ruta);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    db.exec('CREATE TABLE IF NOT EXISTS metadatos (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)');
    for (const tabla of listas)
        db.exec(`CREATE TABLE IF NOT EXISTS ${tabla} (posicion INTEGER PRIMARY KEY, contenido TEXT NOT NULL CHECK(json_valid(contenido)))`);
    const leer = (): Datos | undefined => {
        if (!db.prepare("SELECT valor FROM metadatos WHERE clave='inicializada'").get())
            return;
        const d: any = {};
        for (const tabla of listas)
            d[tabla] = db.prepare(`SELECT contenido FROM ${tabla} ORDER BY posicion`).all().map((r: any) => JSON.parse(r.contenido));
        d.finanzasVersion = Number((db.prepare("SELECT valor FROM metadatos WHERE clave='finanzasVersion'").get() as any)?.valor ?? 1);
        return d;
    };
    const guardar = (d: Datos) => {
        db.exec('BEGIN IMMEDIATE');
        try {
            for (const tabla of listas) {
                db.exec(`DELETE FROM ${tabla}`);
                const insert = db.prepare(`INSERT INTO ${tabla}(posicion,contenido) VALUES (?,?)`);
                (d[tabla] ?? []).forEach((o: any, i: number) => insert.run(i, JSON.stringify(o)));
            }
            db.prepare('INSERT OR REPLACE INTO metadatos(clave,valor) VALUES (?,?)').run('finanzasVersion', String(d.finanzasVersion ?? 1));
            db.prepare('INSERT OR REPLACE INTO metadatos(clave,valor) VALUES (?,?)').run('inicializada', '1');
            db.exec('COMMIT');
        }
        catch (e) {
            db.exec('ROLLBACK');
            throw e;
        }
    };
    return { leer, guardar, cerrar: () => db.close() };
}
