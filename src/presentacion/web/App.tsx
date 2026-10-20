import { useCallback, useEffect, useState } from 'react';
import { SessionProvider, useSesion } from './session';
import { StoreProvider } from './store';
import { Splash } from './components/Splash';
import { Shell, ShellCliente } from './components/Shell';
import { Login } from './screens/Login';
import { Dashboard } from './screens/Dashboard';
import { Clientes } from './screens/Clientes';
import { Catalogo } from './screens/Catalogo';
import { Venta } from './screens/Venta';
import { Estado } from './screens/Estado';
import { Pago } from './screens/Pago';
import { Cronograma } from './screens/Cronograma';
import { MiEstado } from './screens/MiEstado';
import { MiCronograma } from './screens/MiCronograma';
import { Tiendas } from './screens/Tiendas';
import { useStore } from './store';
/** Rutas del comercio: dashboard gerencial, clientes, catálogo, ventas y cobros. */
const RUTAS_COMERCIO: Record<string, () => JSX.Element> = { dashboard: Dashboard, clientes: Clientes, catalogo: Catalogo, venta: Venta, estado: Estado, pago: Pago, cronograma: Cronograma };
/** Rutas del cliente: solo su propia cuenta, en lectura. Nunca las pantallas administrativas de arriba. */
const RUTAS_CLIENTE: Record<string, () => JSX.Element> = { 'mi-estado': MiEstado, 'mi-cronograma': MiCronograma };
const rutaActual = () => window.location.hash.replace(/^#\/?/, '') || 'login';
let splashMostrado = false;
function Enrutador() {
    const { sesion } = useSesion();
    const { clientes } = useStore();
    const [ruta, setRuta] = useState(rutaActual);
    useEffect(() => {
        const f = () => setRuta(rutaActual());
        window.addEventListener('hashchange', f);
        return () => window.removeEventListener('hashchange', f);
    }, []);
    // Sin sesión: siempre el acceso, sin importar qué ruta se haya pedido.
    if (!sesion)
        return <Login />;
    if (sesion.rol === 'Superadministrador') {
        if (ruta !== 'tiendas') {
            window.location.hash = '#/tiendas';
            return null;
        }
        return <Shell ruta={ruta}><Tiendas /></Shell>;
    }
    // Cada rol solo puede entrar a sus propias pantallas; un enlace a la ruta del otro rol redirige a su inicio.
    if (sesion.rol === 'Cliente') {
        const Pantalla = RUTAS_CLIENTE[ruta];
        if (!Pantalla) {
            window.location.hash = '#/mi-estado';
            return null;
        }
        return <ShellCliente ruta={ruta}><Pantalla /></ShellCliente>;
    }
    const Pantalla = RUTAS_COMERCIO[ruta];
    if (!Pantalla) {
        window.location.hash = '#/dashboard';
        return null;
    }
    if (!clientes.length && ['venta', 'estado', 'pago'].includes(ruta))
        return <Shell ruta={ruta}><h1>Registre primero un cliente</h1><a className="btn pri" href="#/clientes">Ir a clientes</a></Shell>;
    return <Shell ruta={ruta}><Pantalla /></Shell>;
}
export function App() {
    const [fase, setFase] = useState<'splash' | 'saliendo' | 'app'>(splashMostrado ? 'app' : 'splash');
    const salir = useCallback(() => { splashMostrado = true; setFase((f) => (f === 'splash' ? 'saliendo' : f)); }, []);
    const listo = useCallback(() => setFase('app'), []);
    return (<SessionProvider>
      <StoreProvider>
        {fase !== 'splash' && <Enrutador />}
        {fase !== 'app' && <Splash leaving={fase === 'saliendo'} onLeave={salir} onDone={listo}/>}
      </StoreProvider>
    </SessionProvider>);
}
