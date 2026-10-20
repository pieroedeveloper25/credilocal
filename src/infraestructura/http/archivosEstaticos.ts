import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
/** Sirve únicamente la compilación pública dist, nunca fuentes ni la base SQLite. */
export function servirArchivos(req: IncomingMessage, res: ServerResponse, url: URL) {
    if (req.method !== 'GET') {
        res.writeHead(405);
        res.end();
        return;
    }
    const raiz = resolve('dist');
    let archivo = resolve(raiz, '.' + decodeURIComponent(url.pathname));
    if (archivo !== raiz && !archivo.startsWith(raiz + sep)) {
        res.writeHead(403);
        res.end();
        return;
    }
    if (!existsSync(archivo) || !statSync(archivo).isFile())
        archivo = resolve(raiz, 'index.html');
    if (!existsSync(archivo)) {
        res.writeHead(503);
        res.end('Ejecute npm run build antes de iniciar.');
        return;
    }
    const tipos: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'Content-Type': tipos[extname(archivo)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(readFileSync(archivo));
}
