import { useState } from 'react';
import { useStore } from '../store';
import { Field, Head, Badge } from '../components/ui';
import type { Tienda } from '../../../contexts/identity-and-access/dominio/modelos';
const nueva = (): Tienda => ({ id: -1, ruc: '', razon: '', nombre: '', giro: '', direccion: '', telefono: '', correo: '', activa: true });
export function Tiendas() {
    const { tiendas, guardarTienda } = useStore();
    const [f, setF] = useState<Tienda>(nueva);
    const [clave, setClave] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const set = (k: keyof Tienda, v: string | boolean) => setF(x => ({ ...x, [k]: v }));
    const guardar = async () => { setOcupado(true); setMensaje(''); try {
        await guardarTienda(f, clave);
        setMensaje('Tienda guardada en la base local.');
        setClave('');
        if (f.id < 0)
            setF(nueva());
    }
    catch (e) {
        setMensaje((e as Error).message);
    }
    finally {
        setOcupado(false);
    } };
    return <>
    <Head title="Gestión de tiendas" sub="Alta y baja de negocios de distintos giros. Cada tienda conserva sus clientes, catálogo y operaciones.">
      <button className="btn pri" onClick={() => { setF(nueva()); setClave(''); setMensaje(''); }}>Nueva tienda</button>
    </Head>
    <section className="card">
      <h2>{f.id < 0 ? 'Registrar tienda' : `Editar ${f.nombre}`}</h2>
      <div className="form-grid">
        {([['ruc', 'RUC', '11 dígitos, sin espacios. No puede repetirse.'], ['razon', 'Razón social', 'Nombre legal del establecimiento.'], ['nombre', 'Nombre comercial', 'Nombre que se mostrará en el panel de la tienda.'], ['giro', 'Giro del negocio', 'Ejemplo: bodega, peluquería, panadería o taller.'], ['direccion', 'Dirección', 'Ubicación del establecimiento.'], ['telefono', 'Teléfono', 'Número de contacto, opcional.'], ['correo', 'Correo del administrador', 'Usuario para acceder con el perfil Comercio. No puede pertenecer a otra cuenta.']] as const).map(([k, label, help]) => <Field key={k} id={`t-${k}`} label={label} helpText={help}><input id={`t-${k}`} className="in" value={f[k]} type={k === 'correo' ? 'email' : 'text'} onChange={e => set(k, e.target.value)}/></Field>)}
        {f.id < 0 && <Field id="t-clave" label="Contraseña inicial" helpText="Entre 8 y 64 caracteres, incluyendo letras y números. Entréguela al administrador del negocio."><input id="t-clave" className="in" type="password" autoComplete="new-password" value={clave} onChange={e => setClave(e.target.value)}/></Field>}
        <Field id="t-estado" label="Estado de la tienda" helpText="La baja bloquea el acceso de Comercio y de sus clientes. Conserva el historial; puede reactivarse."><select id="t-estado" className="in" value={String(f.activa)} onChange={e => set('activa', e.target.value === 'true')}><option value="true">Activa</option><option value="false">De baja</option></select></Field>
      </div>
      <button className="btn pri" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar tienda'}</button>
      {mensaje && <p role="status" className="notice">{mensaje}</p>}
    </section>
    <div className="table-scroll"><table className="tbl"><caption>Tiendas registradas</caption><thead><tr><th>Negocio</th><th>RUC</th><th>Giro</th><th>Administrador</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{tiendas.map(t => <tr key={t.id}><td>{t.nombre}</td><td>{t.ruc}</td><td>{t.giro}</td><td>{t.correo}</td><td><Badge tone={t.activa ? 'ok' : 'bad'}>{t.activa ? 'Activa' : 'De baja'}</Badge></td><td><button className="btn sm" onClick={() => { setF(t); setClave(''); setMensaje(''); }}>Editar {t.nombre}</button></td></tr>)}</tbody></table></div>
  </>;
}
