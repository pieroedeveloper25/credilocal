/**
 * Fondo minimalista y decorativo: puntos finos + dos manchas suaves que
 * derivan muy lento. Puramente ambiental, nunca compite con el contenido.
 */
export function Background() {
    return (<div className="bg-art" aria-hidden="true">
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="1.4" fill="var(--line-strong)"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" opacity="0.55"/>
      </svg>
      <div className="bg-blob bg-blob-a"/>
      <div className="bg-blob bg-blob-b"/>
    </div>);
}
