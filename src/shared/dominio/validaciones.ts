export const normalizarCorreo = (s: string) => s.trim().toLowerCase();

export const correoValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const horaValida = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export function exigir(ok: unknown, mensaje: string): asserts ok { if (!ok)
    throw new Error(mensaje); }

export const activo = (c: {
    activo?: boolean;
}) => c.activo !== false;

export const siguienteId = (l: {
    id: number;
}[]) => Math.max(-1, ...l.map(x => x.id)) + 1;

export function texto(s: string | undefined, min: number, max: number, nombre: string) {
    exigir((s ?? '').trim().length >= min && (s ?? '').length <= max, `${nombre}: entre ${min} y ${max} caracteres.`);
}

export function telefono(s: string | undefined) {
    exigir(/^[+\d]{0,20}$/.test(s ?? ''), 'El teléfono admite hasta 20 caracteres, solo dígitos y +.');
}

export function decimalEntrada(s: string, enteros: number, decimales: number) {
    return new RegExp(`^\\d{1,${enteros}}(\\.\\d{1,${decimales}})?$`).test(s);
}
