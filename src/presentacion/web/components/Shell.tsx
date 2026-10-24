import type { ComponentType, ReactNode } from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useSesion } from '../session';
import { useStore } from '../store';
import { CalendarIcon, CartIcon, CatalogIcon, CreditCardIcon, DashboardIcon, FileTextIcon, LogOutIcon, UsersIcon, } from './Icons';
interface NavItem {
    ruta: string;
    titulo: string;
    icon: ComponentType<{
        size?: number;
    }>;
}
const NAV_COMERCIO: NavItem[] = [
    { ruta: 'dashboard', titulo: 'Dashboard', icon: DashboardIcon },
    { ruta: 'clientes', titulo: 'Clientes', icon: UsersIcon },
    { ruta: 'catalogo', titulo: 'Catálogo', icon: CatalogIcon },
    { ruta: 'venta', titulo: 'Venta a crédito', icon: CartIcon },
    { ruta: 'estado', titulo: 'Estado de cuenta', icon: FileTextIcon },
    { ruta: 'pago', titulo: 'Registrar pago', icon: CreditCardIcon },
    { ruta: 'cronograma', titulo: 'Cronograma', icon: CalendarIcon },
];
const NAV_CLIENTE: NavItem[] = [
    { ruta: 'mi-estado', titulo: 'Mi estado de cuenta', icon: FileTextIcon },
    { ruta: 'mi-cronograma', titulo: 'Mi cronograma', icon: CalendarIcon },
];
/** Cascarón del panel del comercio: navegación completa sobre los 7 procesos operativos. */
export function Shell({ ruta, children }: {
    ruta: string;
    children: ReactNode;
}) {
    const { salir, sesion } = useSesion();
    const { tienda } = useStore();
    return (<div className="app">
      <nav className="side" aria-label="Principal">
        <div className="brand">
          <Logo size={32}/>
          <div>
            <div style={{ fontSize: 18, lineHeight: '22px', fontWeight: 800, letterSpacing: '-0.03em' }}>CrediLocal</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Cuenta corriente comercial</div>
          </div>
        </div>

        <div className="side-store">
          <div style={{ background: 'var(--sunken)', border: '1px solid var(--line-strong)', borderRadius: 12, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{tienda?.nombre ?? 'Administración del sistema'}</div>
            <div className="sub" style={{ fontSize: 11, marginTop: 2 }}>{tienda ? `RUC: ${tienda.ruc} · ${tienda.giro}` : 'Gestión de múltiples tiendas'}</div>
          </div>
        </div>

        <div className="side-links">
          {(sesion?.rol === 'Superadministrador' ? [{ ruta: 'tiendas', titulo: 'Gestión de tiendas', icon: UsersIcon }] : NAV_COMERCIO).map((it) => {
            const IconComp = it.icon;
            const activo = ruta === it.ruta;
            return (<a key={it.ruta} href={`#/${it.ruta}`} className={`nav${activo ? ' on' : ''}`} aria-current={activo ? 'page' : undefined}>
                <span className="nav-icon"><IconComp size={20}/></span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: activo ? 700 : 600 }}>{it.titulo}</span>
              </a>);
        })}
        </div>

        <div className="foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }}/>
            <span>Base 360 · Art. 1257 CC</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--muted)', flex: 1 }}>Rol: {sesion?.rol}</span>
            <ThemeToggle />
            <a href="#/login" onClick={salir} className="btn sm" style={{ height: 30, fontSize: 12, padding: '0 12px', gap: 6, borderRadius: 999 }} aria-label="Cerrar sesión">
              <LogOutIcon size={14}/> Salir
            </a>
          </div>
        </div>
      </nav>
      <main className="main"><div className="wrap page" key={ruta}>{children}</div></main>
    </div>);
}
/** Cascarón del cliente: solo su propia cuenta, en modo lectura, sin acceso a otros negocios ni módulos administrativos. */
export function ShellCliente({ ruta, children }: {
    ruta: string;
    children: ReactNode;
}) {
    const { sesion, salir } = useSesion();
    const { clientes } = useStore();
    const cl = clientes.find(c => c.id === sesion?.clienteId);
    return (<div className="app">
      <nav className="side" aria-label="Principal">
        <div className="brand">
          <Logo size={32}/>
          <div>
            <div style={{ fontSize: 18, lineHeight: '22px', fontWeight: 800, letterSpacing: '-0.03em' }}>CrediLocal</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Portal Cliente</div>
          </div>
        </div>

        <div className="side-store">
          <div style={{ background: 'var(--sunken)', border: '1px solid var(--line-strong)', borderRadius: 12, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{cl?.nombre ?? 'Cliente'}</div>
            <div className="sub" style={{ fontSize: 11, marginTop: 2 }}>{cl?.tipoDoc}: {cl?.doc}</div>
          </div>
        </div>

        <div className="side-links">
          {NAV_CLIENTE.map((it) => {
            const IconComp = it.icon;
            const activo = ruta === it.ruta;
            return (<a key={it.ruta} href={`#/${it.ruta}`} className={`nav${activo ? ' on' : ''}`} aria-current={activo ? 'page' : undefined}>
                <span className="nav-icon"><IconComp size={20}/></span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: activo ? 700 : 600 }}>{it.titulo}</span>
              </a>);
        })}
        </div>

        <div className="foot">
          <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Modo Consulta (Solo Lectura)</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--muted)', flex: 1 }}>Rol: Cliente</span>
            <ThemeToggle />
            <a href="#/login" onClick={salir} className="btn sm" style={{ height: 30, fontSize: 12, padding: '0 12px', gap: 6, borderRadius: 999 }} aria-label="Cerrar sesión">
              <LogOutIcon size={14}/> Salir
            </a>
          </div>
        </div>
      </nav>
      <main className="main"><div className="wrap page" key={ruta}>{children}</div></main>
    </div>);
}
