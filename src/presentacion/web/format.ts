import { Decimal } from '../../dominio/credito/motor';
/** Formato de presentación: 1,217.72 */
export const num = (d: Decimal): string => {
    const [ent, dec] = d.toFixed(2).split('.');
    return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
};
export const sol = (d: Decimal, divisa = 'PEN') => `${divisa === 'USD' ? 'US$' : 'S/'} ${num(d)}`;
export const pct7 = (d: Decimal) => `${d.mul(100).toFixed(7)} %`;
/** Interpreta texto de un input como Decimal; null si no es un número. */
export const leer = (s: string): Decimal | null => {
    if (s.trim() === '')
        return null;
    try {
        const d = new Decimal(s.trim());
        return d.isFinite() ? d : null;
    }
    catch {
        return null;
    }
};
