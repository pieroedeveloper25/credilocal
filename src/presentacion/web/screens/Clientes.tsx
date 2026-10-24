import { useState } from 'react';
import { useStore } from '../store';
import { pct7 } from '../format';
import { Field, Head, CreditMeter, Badge } from '../components/ui';
import { convertirTasas } from '../../../contexts/credit-origination/dominio/motor';
import type { Cliente } from '../../../contexts/customer-management/dominio/modelos';
import { D } from '../../../shared/dominio/decimal';
const nuevo = (): Cliente => ({ id: -1, nombre: '', tipoDoc: 'DNI', doc: '', direccion: '', telefono: '', correo: '', activo: true, horaCorte: '23:59', limite: '5000', deuda: '0', diaCorte: 20, diaPago: 26, plazo: 6, moneda: 'PEN', tipoC: 'Nominal', valC: '24', capC: 'Diaria', tipoM: 'Nominal', valM: '36', capM: 'Diaria' });
export function Clientes() {
    const { clientes, guardarCliente, deudaDe } = useStore();
    const [f, setF] = useState<Cliente>(() => clientes[0] ?? nuevo());
    const [q, setQ] = useState('');
    const [clave, setClave] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const set = <K extends keyof Cliente>(k: K, v: Cliente[K]) => setF(x => ({ ...x, [k]: v }));
    const guardar = async () => { setOcupado(true); setMensaje(''); try {
        await guardarCliente(f, clave);
        setMensaje('Cliente guardado. La baja conserva sus operaciones anteriores.');
        setClave('');
        if (f.id < 0)
            setF(nuevo());
    }
    catch (e) {
        setMensaje((e as Error).message);
    }
    finally {
        setOcupado(false);
    } };
    const tasa = (tipo: Cliente['tipoC'], valor: string, cap: Cliente['capC']) => { try {
        if (!/^\d+(\.\d+)?$/.test(valor))
            return '—';
        const t = convertirTasas(tipo, valor, cap);
        return `TED ${pct7(t.ted)} · TEM ${pct7(t.tem)}`;
    }
    catch {
        return '—';
    } };
    return <>
    <Head title="Clientes" sub="Datos generales, acceso y condiciones de crédito de cada cliente."><button className="btn pri" onClick={() => { setF(nuevo()); setClave(''); setMensaje(''); }}>Nuevo cliente</button></Head>
    <div className="management-grid">
      <section className="card"><Field id="buscar" label="Buscar cliente" helpText="Busque por nombre o documento, incluyendo clientes dados de baja."><input id="buscar" className="in" type="search" value={q} onChange={e => setQ(e.currentTarget.value)}/></Field>
        {clientes.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()) || c.doc.includes(q)).map(c => <button key={c.id} className="list-btn" aria-pressed={f.id === c.id} onClick={() => { setF(c); setClave(''); setMensaje(''); }}>{c.nombre}<br /><small>{c.tipoDoc} {c.doc} · {c.activo === false ? 'De baja' : 'Activo'}</small></button>)}
        {!clientes.length && <p className="sub">Aún no hay clientes en esta tienda.</p>}
      </section>
      <section className="card">
        <h2>{f.id < 0 ? 'Registrar cliente' : f.nombre} <Badge tone={f.activo === false ? 'bad' : 'ok'}>{f.activo === false ? 'De baja' : 'Activo'}</Badge></h2>
        {f.id >= 0 && <CreditMeter divisa={f.moneda} limite={/^\d+(\.\d+)?$/.test(f.limite) ? D(f.limite) : D(0)} deudaActual={deudaDe(f)}/>}
        <div className="form-grid">
          <Field id="c-nombre" label="Nombre o razón social" helpText="Identificación completa del cliente."><input id="c-nombre" className="in" value={f.nombre} onChange={e => set('nombre', e.currentTarget.value)}/></Field>
          <Field id="c-tipo" label="Tipo de documento" helpText="DNI: 8 dígitos. RUC: 11 dígitos."><select id="c-tipo" className="in" value={f.tipoDoc} onChange={e => set('tipoDoc', e.currentTarget.value as Cliente['tipoDoc'])}><option>DNI</option><option>RUC</option></select></Field>
          <Field id="c-doc" label="Documento de identidad" helpText="Solo dígitos. No puede repetirse dentro de la tienda."><input id="c-doc" className="in" inputMode="numeric" value={f.doc} onChange={e => set('doc', e.currentTarget.value)}/></Field>
          {(['direccion', 'telefono', 'correo'] as const).map(k => <Field key={k} id={`c-${k}`} label={{ direccion: 'Dirección', telefono: 'Teléfono', correo: 'Correo del cliente' }[k]} helpText={k === 'correo' ? 'Opcional. Si registra correo y contraseña inicial, el cliente podrá consultar su propia cuenta.' : 'Dato de contacto opcional.'}><input id={`c-${k}`} className="in" type={k === 'correo' ? 'email' : 'text'} value={f[k] ?? ''} onChange={e => set(k, e.currentTarget.value)}/></Field>)}
          <Field id="c-clave" label="Contraseña inicial de acceso" helpText="Complete solo al habilitar por primera vez el acceso por correo: entre 8 y 64 caracteres, letras y números. No modifica contraseñas existentes."><input id="c-clave" className="in" type="password" autoComplete="new-password" value={clave} onChange={e => setClave(e.currentTarget.value)}/></Field>
          <Field id="c-estado" label="Estado del cliente" helpText="La baja bloquea nuevas ventas y el acceso del cliente, conservando deudas, pagos e historial."><select id="c-estado" className="in" value={String(f.activo !== false)} onChange={e => set('activo', e.currentTarget.value === 'true')}><option value="true">Activo</option><option value="false">De baja</option></select></Field>
          <Field id="limite" label="Línea de crédito" help="limite"><input id="limite" className="in" inputMode="decimal" value={f.limite} onChange={e => set('limite', e.currentTarget.value)}/></Field>
          <Field id="moneda" label="Moneda" help="moneda"><select id="moneda" className="in" value={f.moneda} onChange={e => set('moneda', e.currentTarget.value as Cliente['moneda'])}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></Field>
          {([['plazo', 'Plazo máximo, meses', 'plazo'], ['diaCorte', 'Día de corte', 'corte'], ['diaPago', 'Día de pago', 'pago']] as const).map(([k, label, help]) => <Field key={k} id={k} label={label} help={help}><input id={k} className="in" type="number" value={f[k]} onChange={e => set(k, Number(e.currentTarget.value))}/></Field>)}
          <Field id="horaCorte" label="Hora de corte" helpText="Hora local de Perú. En el día de corte, las compras hasta esta hora pertenecen al ciclo actual; las posteriores, al siguiente."><input id="horaCorte" className="in" type="time" value={f.horaCorte ?? '23:59'} onInput={e => set('horaCorte', e.currentTarget.value)}/></Field>
        </div>
        {(['C', 'M'] as const).map(t => <section key={t} className="card"><h3>Tasa {t === 'C' ? 'compensatoria' : 'moratoria'}</h3><div className="form-grid">
          <Field id={`tipo${t}`} label={`Tipo de tasa ${t === 'C' ? 'compensatoria' : 'moratoria'}`} help={`tipo${t}`}><select id={`tipo${t}`} className="in" value={f[`tipo${t}`]} onChange={e => set(`tipo${t}`, e.currentTarget.value as Cliente['tipoC'])}><option>Nominal</option><option>Efectiva</option></select></Field>
          <Field id={`val${t}`} label={`Valor anual ${t === 'C' ? 'compensatorio' : 'moratorio'}, %`} help={`val${t}`}><input id={`val${t}`} className="in" inputMode="decimal" value={f[`val${t}`]} onChange={e => set(`val${t}`, e.currentTarget.value)}/></Field>
          {f[`tipo${t}`] === 'Nominal' && <Field id={`cap${t}`} label={`Capitalización ${t === 'C' ? 'compensatoria' : 'moratoria'}`} help="cap"><select id={`cap${t}`} className="in" value={f[`cap${t}`]} onChange={e => set(`cap${t}`, e.currentTarget.value as Cliente['capC'])}><option>Diaria</option><option>Mensual</option></select></Field>}
        </div><p className="sub num">{tasa(f[`tipo${t}`], f[`val${t}`], f[`cap${t}`])}</p></section>)}
        <button className="btn pri" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar cliente'}</button>
        {mensaje && <p className="notice" role="status">{mensaje}</p>}
      </section>
    </div>
  </>;
}
