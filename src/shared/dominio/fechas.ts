import { exigir } from './validaciones';
export function relojPeru(ahora = new Date()) {
    const partes = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ahora);
    const v = (t: string) => partes.find(p => p.type === t)!.value;
    return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}

/* ---------- Fechas (UTC, sin zona horaria) ---------- */
export const MS = 86_400_000;

export function ultimoDia(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Construye (anio, mes, dia) saturando al último día del mes. 2026-02-30 -> 2026-02-28. */
export function establecerDia(anio: number, mes: number, dia: number): Date {
  const y = anio + Math.floor((mes - 1) / 12);
  const m = ((((mes - 1) % 12) + 12) % 12) + 1;
  return new Date(Date.UTC(y, m - 1, Math.min(dia, ultimoDia(y, m))));
}

export const agregarMeses = (f: Date, n: number) =>
  establecerDia(f.getUTCFullYear(), f.getUTCMonth() + 1 + n, f.getUTCDate());

export const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / MS);

export const parseFecha = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const dos = (n: number) => String(n).padStart(2, '0');

export const isoFecha = (d: Date) => `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;

export const fmtFecha = (d: Date) => `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

export const fechaValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseFecha(s).getTime()) && isoFecha(parseFecha(s)) === s;

export function fechaPagoPeriodo(periodo: string, dia: number) {
    exigir(/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo), 'Seleccione un período válido.');
    const [y, m] = periodo.split('-').map(Number);
    return isoFecha(establecerDia(y, m, dia));
}
