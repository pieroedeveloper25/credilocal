import { useEffect } from 'react';
import { Logo } from './Logo';
const PALABRA = 'CrediLocal';
const reducido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/**
 * Pantalla de carga: el logo aparece al centro, sube ligeramente y de él
 * salen las letras de CrediLocal. Luego cede el paso a la aplicación.
 * Línea de tiempo: logo 0.2 s, ascenso 1.25 s, letras 1.55 s, salida 3.6 s.
 */
export function Splash({ leaving, onLeave, onDone }: {
    leaving: boolean;
    onLeave: () => void;
    onDone: () => void;
}) {
    useEffect(() => {
        const t1 = window.setTimeout(onLeave, reducido() ? 700 : 3600);
        return () => window.clearTimeout(t1);
    }, [onLeave]);
    useEffect(() => {
        if (!leaving)
            return;
        const t = window.setTimeout(onDone, 850);
        return () => window.clearTimeout(t);
    }, [leaving, onDone]);
    return (<div className={`splash${leaving ? ' leaving' : ''}`} onClick={onLeave} role="status" aria-label="Cargando CrediLocal">
      <div className="splash-stack">
        <div className="splash-logo"><Logo size={72}/></div>
        <div className="splash-word" aria-hidden="true">
          {[...PALABRA].map((ch, i) => (<span key={i} style={{ ['--i' as string]: i }}>{ch}</span>))}
        </div>
      </div>
      <div className="splash-bar" aria-hidden="true"><i /></div>
    </div>);
}
