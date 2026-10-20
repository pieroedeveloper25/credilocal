import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
const REDUCIDO = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/**
 * Inclinación 3D sutil que sigue el puntero. Minimalista: pocos grados,
 * un solo highlight especular. Se desactiva con movimiento reducido o táctil.
 */
export function Tilt3D({ children, max = 7, className = '', style }: {
    children: ReactNode;
    max?: number;
    className?: string;
    style?: CSSProperties;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const mover = (e: PointerEvent<HTMLDivElement>) => {
        if (REDUCIDO() || e.pointerType === 'touch' || !ref.current)
            return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ref.current.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
        ref.current.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
        ref.current.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(1)}%`);
        ref.current.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(1)}%`);
    };
    const salir = () => {
        if (!ref.current)
            return;
        ref.current.style.setProperty('--rx', '0deg');
        ref.current.style.setProperty('--ry', '0deg');
    };
    return (<div ref={ref} className={`tilt3d ${className}`} style={style} onPointerMove={mover} onPointerLeave={salir}>
      <div className="tilt3d-inner">{children}</div>
      <div className="tilt3d-sheen"/>
    </div>);
}
