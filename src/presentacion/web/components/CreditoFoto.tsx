import type { CreditoImagen } from '../../../contexts/product-catalog/dominio/modelos';

/** Atribución de los recursos de demostración; no afecta imágenes propias sin metadatos. */
export function CreditoFoto({ credito }: { credito?: CreditoImagen }) {
    if (!credito) return null;
    const fuente = credito.urlFuente?.startsWith('https://') ? credito.urlFuente : undefined;
    const licencia = credito.urlLicencia?.startsWith('https://') ? credito.urlLicencia : undefined;
    return <small className="imagen-credito">
        Imagen referencial. Foto: {credito.autor}.{' '}
        <a href={fuente} target="_blank" rel="noopener noreferrer">Fuente</a>{' · '}
        <a href={licencia} target="_blank" rel="noopener noreferrer">{credito.licencia}</a>
    </small>;
}
