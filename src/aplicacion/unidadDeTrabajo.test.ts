import { describe, expect, it } from 'vitest';
import { crearUnidadDeTrabajo } from './unidadDeTrabajo';
import type { RepositorioDatos } from './puertos';
describe('unidad de trabajo independiente de SQLite y HTTP', () => {
    it('espera una operación asíncrona y permite continuar después de un rechazo', async () => {
        const repositorio: RepositorioDatos = { leer: () => undefined, guardar: () => { }, cerrar: () => { } };
        const trabajo = crearUnidadDeTrabajo(repositorio);
        const eventos: string[] = [];
        let desbloquear!: () => void;
        let avisarInicio!: () => void;
        const espera = new Promise<void>(resolver => { desbloquear = resolver; });
        const iniciada = new Promise<void>(resolver => { avisarInicio = resolver; });
        const primera = trabajo.ejecutar(async () => {
            eventos.push('inicio');
            avisarInicio();
            await espera;
            eventos.push('rechazo');
            throw new Error('Operación rechazada');
        });
        const rechazo = primera.catch(error => error);
        const segunda = trabajo.ejecutar(() => { eventos.push('siguiente'); return 42; });
        await iniciada;
        expect(eventos).toEqual(['inicio']);
        desbloquear();
        expect(await rechazo).toEqual(new Error('Operación rechazada'));
        expect(await segunda).toBe(42);
        await trabajo.esperar();
        expect(eventos).toEqual(['inicio', 'rechazo', 'siguiente']);
    });
});
