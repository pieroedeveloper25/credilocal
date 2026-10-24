/** Contrato común de los eventos de dominio que cruzan los límites entre contextos. */
export interface EventoDeDominio {
    readonly tipo: string;
}
