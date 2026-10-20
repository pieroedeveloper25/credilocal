import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import type { Datos, Sesion } from '../../dominio/modelos';
import { activo, exigir, normalizarCorreo } from '../../dominio/validaciones';
import { comprobarClave } from './credenciales';
export function crearSesiones() {
    const sesiones = new Map<string, {
        cuentaId: number;
        vence: number;
    }>();
    const cookie = (req: IncomingMessage) => /\bcredilocal=([a-f0-9]{64})\b/.exec(req.headers.cookie ?? '')?.[1];
    const sesionDe = (req: IncomingMessage, d: Datos): Sesion => {
        const token = cookie(req), s = token && sesiones.get(token);
        exigir(s && s.vence > Date.now(), 'Inicie sesión.');
        const a = d.cuentas.find(a => a.id === s.cuentaId);
        exigir(a, 'La cuenta ya no está habilitada.');
        if (a.rol !== 'Superadministrador')
            exigir(d.tiendas.some(t => t.id === a.tiendaId && t.activa), 'La tienda está dada de baja.');
        if (a.rol === 'Cliente')
            exigir(d.clientes.some(c => c.id === a.clienteId && c.tiendaId === a.tiendaId && activo(c)), 'El cliente está dado de baja.');
        return { rol: a.rol, correo: a.correo, tiendaId: a.tiendaId ?? 0, clienteId: a.clienteId ?? -1 };
    };
    const intentos = new Map<string, {
        n: number;
        hasta: number;
    }>();
    async function entrar(req: IncomingMessage, res: ServerResponse, d: Datos, pedido: {
        correo: string;
        clave: string;
        rol: string;
    }) {
        exigir(typeof pedido.correo === 'string' && typeof pedido.clave === 'string' && pedido.clave.length <= 64, 'Ingrese correo y contraseña válidos.');
        const llave = `${req.socket.remoteAddress}:${normalizarCorreo(pedido.correo)}:${pedido.rol}`;
        const fallo = intentos.get(llave);
        exigir(!fallo || fallo.hasta < Date.now() || fallo.n < 10, 'Demasiados intentos. Espere diez minutos.');
        const a = d.cuentas.find(a => a.rol === pedido.rol && a.correo === normalizarCorreo(pedido.correo));
        if (!a || !await comprobarClave(a, pedido.clave)) {
            intentos.set(llave, { n: (fallo && fallo.hasta > Date.now() ? fallo.n : 0) + 1, hasta: Date.now() + 600000 });
            throw new Error('Correo, contraseña o perfil incorrectos.');
        }
        const token = randomBytes(32).toString('hex');
        sesiones.set(token, { cuentaId: a.id, vence: Date.now() + 8 * 3600000 });
        const simulada = { headers: { cookie: `credilocal=${token}` } } as IncomingMessage;
        let s: Sesion;
        try {
            s = sesionDe(simulada, d);
        }
        catch (e) {
            sesiones.delete(token);
            throw e;
        }
        const viejo = cookie(req);
        if (viejo)
            sesiones.delete(viejo);
        intentos.delete(llave);
        for (const [t, info] of sesiones)
            if (info.vence < Date.now())
                sesiones.delete(t);
        res.setHeader('Set-Cookie', `credilocal=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
        return s;
    }
    function salir(req: IncomingMessage, res: ServerResponse) {
        const token = cookie(req);
        if (token)
            sesiones.delete(token);
        res.setHeader('Set-Cookie', 'credilocal=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    }
    return { entrar, salir, obtener: sesionDe };
}
