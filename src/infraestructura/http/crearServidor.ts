import { createServer } from 'node:http';
import { type Operacion } from '../../aplicacion/ejecutarOperacion';
import { datosVisibles } from '../../aplicacion/datosVisibles';
import { registrarOperacion } from '../../aplicacion/registrarOperacion';
import { enviar, cuerpo } from './json';
import { servirArchivos } from './archivosEstaticos';
import { crearSesiones } from '../../contexts/identity-and-access/infraestructura/sesiones';
import type { CreadorDeCuentas } from '../../shared/aplicacion/puertos';
import type { crearUnidadDeTrabajo } from '../../shared/aplicacion/unidadDeTrabajo';
import { exigir } from '../../shared/dominio/validaciones';
export function crearServidor(trabajo: ReturnType<typeof crearUnidadDeTrabajo>, cuentas: CreadorDeCuentas, ahora: () => string) {
    const sesiones = crearSesiones();
    const servidor = createServer(async (req, res) => {
        try {
            const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
            if (url.pathname === '/api/salud' && req.method === 'GET') {
                enviar(res, 200, { estado: 'ok', almacenamiento: 'SQLite' });
                return;
            }
            if (url.pathname.startsWith('/api/')) {
                if (req.method !== 'GET' && req.method !== 'POST') {
                    enviar(res, 405, { error: 'Método no permitido.' });
                    return;
                }
                if (req.method === 'POST' && req.headers.origin)
                    exigir(new URL(req.headers.origin).host === req.headers.host, 'Origen de solicitud no permitido.');
                const pedido = req.method === 'POST' ? await cuerpo(req) : undefined;
                await trabajo.ejecutar(async () => {
                    const d = trabajo.repositorio.leer()!;
                    if (url.pathname === '/api/login' && req.method === 'POST') {
                        const s = await sesiones.entrar(req, res, d, pedido);
                        enviar(res, 200, { sesion: s, datos: datosVisibles(d, s) });
                        return;
                    }
                    if (url.pathname === '/api/logout' && req.method === 'POST') {
                        sesiones.salir(req, res);
                        enviar(res, 200, { estado: 'ok' });
                        return;
                    }
                    const s = sesiones.obtener(req, d);
                    if (url.pathname === '/api/estado' && req.method === 'GET') {
                        enviar(res, 200, datosVisibles(d, s));
                        return;
                    }
                    if (url.pathname === '/api/operacion' && req.method === 'POST') {
                        exigir(typeof pedido.accion === 'string' && pedido.pedido && typeof pedido.pedido === 'object', 'Operación inválida.');
                        const resultado = await registrarOperacion(d, s, pedido as Operacion, cuentas, trabajo.repositorio, ahora);
                        enviar(res, 200, { resultado: resultado ?? null, datos: datosVisibles(d, s) });
                        return;
                    }
                    enviar(res, 404, { error: 'Recurso no encontrado.' });
                });
                return;
            }
            servirArchivos(req, res, url);
        }
        catch (e) {
            enviar(res, (e as Error).message === 'Inicie sesión.' ? 401 : 400, { error: (e as Error).message });
        }
    });
    return servidor;
}
