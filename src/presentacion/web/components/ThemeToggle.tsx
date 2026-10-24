import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from './Icons';

type Tema = 'light' | 'dark';
const CLAVE = 'credilocal-tema';

function temaInicial(): Tema {
    try {
        const guardado = localStorage.getItem(CLAVE);
        if (guardado === 'light' || guardado === 'dark')
            return guardado;
    }
    catch { /* sin almacenamiento: se usa la preferencia del sistema */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Alterna entre claro y oscuro. La elección se recuerda; sin elección, manda el sistema. */
export function ThemeToggle() {
    const [tema, setTema] = useState<Tema>(temaInicial);
    useEffect(() => { document.documentElement.dataset.theme = tema; }, [tema]);
    const cambiar = () => {
        const siguiente: Tema = tema === 'dark' ? 'light' : 'dark';
        const raiz = document.documentElement;
        raiz.classList.add('tema-anim');
        window.setTimeout(() => raiz.classList.remove('tema-anim'), 350);
        try { localStorage.setItem(CLAVE, siguiente); }
        catch { /* se aplica solo en esta sesión */ }
        setTema(siguiente);
    };
    return (<button type="button" className="theme-toggle" onClick={cambiar} aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
      {tema === 'dark' ? <SunIcon size={16}/> : <MoonIcon size={16}/>}
    </button>);
}
