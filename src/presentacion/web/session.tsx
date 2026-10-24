import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Sesion } from '../../contexts/identity-and-access/dominio/modelos';
export type { Rol, Sesion } from '../../contexts/identity-and-access/dominio/modelos';
interface SessionApi {
    sesion: Sesion | null;
    entrar: (s: Sesion) => void;
    salir: () => void;
}
const Ctx = createContext<SessionApi | null>(null);
export const useSesion = () => { const s = useContext(Ctx); if (!s)
    throw new Error('SessionProvider'); return s; };
export function SessionProvider({ children }: {
    children: ReactNode;
}) {
    const [sesion, setSesion] = useState<Sesion | null>(null);
    const entrar = useCallback((s: Sesion) => setSesion(s), []);
    const salir = useCallback(() => { setSesion(null); void api('logout', {}).catch(() => undefined); }, []);
    const value = useMemo(() => ({ sesion, entrar, salir }), [sesion, entrar, salir]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
