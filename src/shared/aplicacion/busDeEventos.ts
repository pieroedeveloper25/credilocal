import type { Datos } from '../dominio/datos';
import type { EventoDeDominio } from '../dominio/eventos';

/** Publica un evento; los suscriptores actúan sobre los mismos datos de la unidad de trabajo. */
export type Publicar = (evento: EventoDeDominio, datos: Datos) => void;
export type Suscriptor<E extends EventoDeDominio> = (evento: E, datos: Datos) => void;

/** Bus síncrono en proceso: todos los suscriptores corren antes de que publicar() retorne. */
export function crearBusDeEventos() {
    const suscriptores = new Map<string, Suscriptor<never>[]>();
    return {
        suscribir<E extends EventoDeDominio>(tipo: E['tipo'], suscriptor: Suscriptor<E>) {
            suscriptores.set(tipo, [...(suscriptores.get(tipo) ?? []), suscriptor as Suscriptor<never>]);
        },
        publicar: ((evento, datos) => {
            for (const suscriptor of suscriptores.get(evento.tipo) ?? [])
                (suscriptor as Suscriptor<EventoDeDominio>)(evento, datos);
        }) as Publicar,
    };
}
