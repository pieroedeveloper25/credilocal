import { useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { Logo } from '../components/Logo';
import { Tilt3D } from '../components/Tilt3D';
import { Field, Seg, idx, tipId } from '../components/ui';
import { ZapIcon, ShieldCheckIcon, ArrowUpRightIcon } from '../components/Icons';
import { useSesion } from '../session';
import { useStore } from '../store';
type RolUI = 'Superadministrador' | 'Comercio' | 'Cliente';
export function Login() {
    const { entrar } = useSesion();
    const { autenticar, listo, errorBase } = useStore();
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [ver, setVer] = useState(false);
    const [rol, setRol] = useState<RolUI>('Comercio');
    const [intentos, setIntentos] = useState(0);
    const [ok, setOk] = useState(false);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passOk = pass.length >= 8;
    const bloqueada = intentos >= 3;
    const errEmail = email && !emailOk ? 'Ingrese un correo válido' : undefined;
    const errPass = pass && !passOk ? 'La contraseña requiere al menos 8 caracteres' : undefined;
    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailOk || !passOk || bloqueada)
            return;
        try {
            setError('');
            const sesion = await autenticar(rol, email, pass);
            setOk(true);
            entrar(sesion);
            window.location.hash = rol === 'Superadministrador' ? '#/tiendas' : rol === 'Comercio' ? '#/dashboard' : '#/mi-estado';
        }
        catch (e) {
            setError((e as Error).message);
            setIntentos(n => n + 1);
        }
    };
    const autoComercio = () => {
        setEmail('admin@sutaller.pe');
        setPass('credi2026');
        setRol('Comercio');
    };
    const autoCliente = () => {
        setEmail('contacto@transintegrales.pe');
        setPass('credi2026');
        setRol('Cliente');
    };
    return (<div className="login-wrap page">
      <div className="theme-corner"><ThemeToggle /></div>
      <div className="login-card rv" style={idx(0)}>
        {/* PANEL IZQUIERDO: Showcase Visual Fintech Automotriz */}
        <div className="login-showcase">
          {/* Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Logo size={36}/>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: '20px' }}>
                  CrediLocal
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Cuenta corriente comercial
                </div>
              </div>
            </div>
            <span style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(6px)',
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
        }}>
              Base 360 · Art. 1257 CC
            </span>
          </div>

          {/* Headline & Simulación Interactiva */}
          <div style={{ margin: '32px 0', zIndex: 1 }}>
            <h2 style={{ fontSize: 28, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Cada sol fiado, con su fecha y su interés exacto.
            </h2>
            <p style={{ fontSize: 13, lineHeight: '20px', opacity: 0.8, marginTop: 10, maxWidth: '42ch' }}>
              Cuenta corriente para negocios de distintos giros. Liquidaciones, método francés y control de créditos.
            </p>

            {/* Simulación Flotante Glassmorphism */}
            <Tilt3D max={4} style={{ marginTop: 24 }}>
              <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 18,
            padding: '18px 20px',
            boxShadow: '0 16px 32px rgba(0, 0, 0, 0.25)',
        }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.8 }}>
                    Simulación de Liquidación
                  </span>
                  <span style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                    ● En línea
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                    <span>Capital facturado (Repuestos)</span>
                    <span className="num" style={{ fontWeight: 600 }}>S/ 1,200.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                    <span>Int. Compensatorio (16 días Base 360)</span>
                    <span className="num" style={{ color: '#60a5fa', fontWeight: 600 }}>S/ 12.86</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                    <span>Int. Moratorio (TNA 15 %, 4 días)</span>
                    <span className="num" style={{ color: '#fbbf24', fontWeight: 600 }}>S/ 2.02</span>
                  </div>
                  <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 8,
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            fontSize: 14,
            fontWeight: 700,
        }}>
                    <span>Total Exigible Liquidado</span>
                    <span className="num" style={{ color: '#34d399', fontSize: 16 }}>S/ 1,214.88</span>
                  </div>
                </div>
              </div>
            </Tilt3D>
          </div>

          {/* Footer de Empresa y Respaldo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1, fontSize: 11, opacity: 0.75 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheckIcon size={14}/>
              <span>Plataforma para múltiples tiendas</span>
            </div>
            <span>v0.2.0 · Ciclo 2026-20</span>
          </div>
        </div>

        {/* PANEL DERECHO: Formulario Minimalista y Compacto */}
        <div className="login-form-side">
          <form onSubmit={enviar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 26, lineHeight: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
                Iniciar Sesión
              </h1>
              <p className="sub" style={{ fontSize: 13, marginTop: 4 }}>
                Seleccione su perfil de acceso para ingresar a la plataforma.
              </p>
            </div>

            {/* Selector de Perfil */}
            <div style={{ margin: '4px 0 2px' }}>
              <Field id="rol" label="Perfil de usuario" helpText="Superadministrador gestiona tiendas; Comercio administra su negocio; Cliente consulta únicamente su cuenta.">
              <Seg<RolUI> value={rol} options={['Superadministrador', 'Comercio', 'Cliente']} onChange={setRol} label="Rol de acceso"/>
              </Field>
            </div>

            {/* Botones de Autocompletado Rápido */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn sm" style={{
            flex: 1,
            gap: 6,
            fontSize: 11,
            background: rol === 'Comercio' ? 'var(--sunken)' : 'transparent',
            borderColor: rol === 'Comercio' ? 'var(--accent)' : 'var(--line)',
            fontWeight: 600,
        }} onClick={autoComercio}>
                <ZapIcon size={13}/> Demo: Comercio
              </button>
              <button type="button" className="btn sm" style={{
            flex: 1,
            gap: 6,
            fontSize: 11,
            background: rol === 'Cliente' ? 'var(--sunken)' : 'transparent',
            borderColor: rol === 'Cliente' ? 'var(--accent)' : 'var(--line)',
            fontWeight: 600,
        }} onClick={autoCliente}>
                <ZapIcon size={13}/> Demo: Cliente
              </button>
            </div>

            {/* Inputs de Correo y Clave */}
            <button type="button" className="btn sm" onClick={() => { setEmail('sistema@credilocal.pe'); setPass('credi2026'); setRol('Superadministrador'); }}>Demo: Superadministrador</button>
            {!listo && <p role="status">{errorBase || 'Abriendo la base local…'}</p>}
            {error && <p role="alert" className="err-msg">{error}</p>}
            <div>
              <Field id="email" label="Correo electrónico" help="usuario" error={errEmail}>
                <input id="email" className={`in${errEmail ? ' err' : ''}`} type="email" autoComplete="username" placeholder="admin@sutaller.pe" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errEmail} aria-describedby={tipId('email')}/>
              </Field>
            </div>

            <div>
              <Field id="pass" label="Contraseña" help="clave" error={errPass}>
                <div style={{ position: 'relative' }}>
                  <input id="pass" className={`in${errPass ? ' err' : ''}`} type={ver ? 'text' : 'password'} autoComplete="current-password" placeholder="Mínimo 8 caracteres" value={pass} onChange={(e) => setPass(e.target.value)} aria-invalid={!!errPass} aria-describedby={tipId('pass')} style={{ paddingRight: 84 }}/>
                  <button type="button" className="btn sm" style={{ position: 'absolute', right: 5, top: 5, height: 32, fontSize: 11, padding: '0 10px' }} onClick={() => setVer((v) => !v)}>
                    {ver ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </Field>
            </div>

            {/* Alertas y Mensajes */}
            {bloqueada && (<div className="notice" role="alert">
                <div>Se superaron 3 intentos en este formulario. <button type="button" className="btn sm" onClick={() => { setIntentos(0); setError(''); }}>Reintentar</button></div>
              </div>)}
            {intentos > 0 && !bloqueada && !ok && (<div className="err-msg" role="alert">
                Intentos restantes en este formulario: {3 - intentos}
              </div>)}
            {ok && (<div className="toast" role="status">
                Sesión autenticada como {rol}. Ingresando al panel…
              </div>)}

            {/* Botón de Envío */}
            <button type="submit" className="btn-pill emerald" style={{
            height: 46,
            fontSize: 14,
            width: '100%',
            marginTop: 4,
            opacity: (!emailOk || !passOk || bloqueada || ok) ? 0.5 : 1,
            cursor: (!emailOk || !passOk || bloqueada || ok) ? 'not-allowed' : 'pointer',
        }} disabled={!listo || !emailOk || !passOk || bloqueada || ok}>
              {ok ? 'Autenticando…' : 'Ingresar a la Plataforma'} <ArrowUpRightIcon size={16}/>
            </button>

            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Contraseña demo: <span className="num" style={{ color: 'var(--ink)', fontWeight: 700 }}>credi2026</span>
            </div>
          </form>
        </div>
      </div>
    </div>);
}
