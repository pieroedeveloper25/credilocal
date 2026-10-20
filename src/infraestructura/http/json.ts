import type { IncomingMessage, ServerResponse } from 'node:http';
export function enviar(res: ServerResponse, codigo: number, valor: unknown) {
    res.writeHead(codigo, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(valor));
}

export async function cuerpo(req: IncomingMessage) {
    let texto = '';
    for await (const parte of req) {
        texto += parte;
        if (Buffer.byteLength(texto) > 4 * 1024 * 1024) {
            throw new Error('El contenido supera 4 MB.');
        }
    }
    try {
        return JSON.parse(texto || '{}');
    } catch {
        throw new Error('Solicitud JSON inválida.');
    }
}
