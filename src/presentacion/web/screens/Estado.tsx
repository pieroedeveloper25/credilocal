import { useState } from 'react';
import { useStore } from '../store';
import { num, pct7 } from '../format';
import { Badge, Field, Head, Money } from '../components/ui';
import { D } from '../../../shared/dominio/decimal';
import { fechaPagoPeriodo, fmtFecha, parseFecha, relojPeru } from '../../../shared/dominio/fechas';
export function Estado({ clientePropio = false }: {
    clientePropio?: boolean;
} = {}) {
    const { clientes, obligaciones, listados, liquidarDe, emitirListado, pagos } = useStore();
    const [ci, setCi] = useState(clientes[0]?.id ?? -1);
    const [periodo, setPeriodo] = useState(() => relojPeru().slice(0, 7));
    const [fecha, setFecha] = useState('');
    const [tab, setTab] = useState<'deuda' | 'cuotas' | 'corte'>('deuda');
    const [aviso, setAviso] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const c = clientes.find(c => c.id === ci) ?? clientes[0];
    const prevista = fechaPagoPeriodo(periodo, c.diaPago), real = fecha || prevista;
    let error = '', l: ReturnType<typeof liquidarDe>;
    try {
        l = liquidarDe(c, periodo, real);
    }
    catch (e) {
        error = (e as Error).message;
        l = { lineas: [], capital: D(0), comp: D(0), mora: D(0), total: D(0), vencimiento: parseFecha(prevista), diasMora: 0 };
    }
    const listado = listados.find(x => x.clienteId === c.id && x.periodo === periodo);
    const cuotas = obligaciones.filter(o => o.clienteId === c.id && o.cuota > 0).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento) || a.ventaId - b.ventaId);
    const emitir = async () => { setOcupado(true); try {
        const x = await emitirListado(c.id, periodo);
        setAviso(`Corte guardado: ${x.corte.replace('T', ' ')}. Total ${x.total} ${x.moneda}.`);
        setTab('corte');
    }
    catch (e) {
        setAviso((e as Error).message);
    }
    finally {
        setOcupado(false);
    } };
    return <>
    <Head title={clientePropio ? 'Mi estado de cuenta' : 'Estado de cuenta'} sub="Compras y cuotas pendientes, con intereses y mora separados."><Badge tone={l.mora.gt(0) ? 'warn' : 'info'}>{l.mora.gt(0) ? 'Con mora' : l.total.gt(0) ? 'Deuda pendiente' : 'Sin deuda exigible'}</Badge></Head>
    <div className="card form-grid">
      {!clientePropio && <Field id="cli" label="Cliente" help="cliente"><select id="cli" className="in" value={c.id} onChange={e => { setCi(+e.currentTarget.value); setFecha(''); setAviso(''); }}>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.activo === false ? ' (de baja)' : ''}</option>)}</select></Field>}
      <Field id="per" label="Período" help="periodo"><input id="per" type="month" className="in" value={periodo} onInput={e => { setPeriodo(e.currentTarget.value || relojPeru().slice(0, 7)); setFecha(''); setAviso(''); }}/></Field>
      <Field id="fr" label="Fecha de consulta" helpText="Incluye todas las obligaciones pendientes hasta la fecha pactada o la fecha consultada, si es posterior. La mora se recalcula por obligación."><input id="fr" type="date" className="in" value={real} onInput={e => setFecha(e.currentTarget.value)}/></Field>
    </div>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="form-grid">{([['Capital', l.capital], ['Interés compensatorio', l.comp], ['Interés moratorio', l.mora], ['Total exigible', l.total]] as const).map(([t, v]) => <section className="stat" key={t}><div className="t">{t}</div><div className="v"><Money value={v} divisa={c.moneda}/></div></section>)}</div>
    <div className="form-grid"><p>Fecha pactada: {fmtFecha(l.vencimiento)}. Incluye deudas anteriores pendientes.</p>{!clientePropio && <div><button className="btn pri" disabled={ocupado} onClick={emitir}>{listado ? 'Actualizar corte' : 'Emitir corte'}</button> <a className="btn" href="#/pago">Registrar pago</a></div>}</div>
    {aviso && <p className="toast" role="status">{aviso}</p>}
    <div className="card flat"><div className="tabs" role="tablist">{([['deuda', 'Deuda exigible'], ['cuotas', 'Cuotas registradas'], ['corte', 'Listado guardado']] as const).map(([k, t]) => <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t}</button>)}</div>
    {tab === 'deuda' && <div className="table-scroll"><table className="tbl"><caption>Obligaciones pendientes ordenadas por fecha de compra</caption><thead><tr><th>Compra</th><th>Detalle</th><th>Vence</th><th>Capital</th><th>Interés</th><th>Mora</th><th>Total</th></tr></thead><tbody>{l.lineas.map(o => <tr key={o.id}><td>{o.fechaCompra}</td><td>{o.detalle}{o.cuota ? ` · cuota ${o.cuota}` : ''}</td><td>{o.vencimiento}</td><td>{num(D(o.capital))} {o.moneda}</td><td>{num(D(o.comp))}</td><td>{num(D(o.mora))}</td><td>{num(D(o.total))}</td></tr>)}</tbody></table>{!l.lineas.length && <p className="empty">No hay obligaciones pendientes para esta consulta.</p>}</div>}
    {tab === 'cuotas' && <div className="table-scroll"><table className="tbl"><caption>Cuotas de todos los financiamientos del cliente</caption><thead><tr><th>Venta</th><th>Cuota</th><th>Vence</th><th>Amortización</th><th>Interés</th><th>Cuota</th><th>Estado</th></tr></thead><tbody>{cuotas.map(o => <tr key={o.id}><td>OP-{o.ventaId}</td><td>{o.cuota}</td><td>{o.vencimiento}</td><td>{num(D(o.capital))} {o.moneda}</td><td>{num(D(o.comp))}</td><td>{num(D(o.capital).plus(o.comp))}</td><td>{o.pagada ? 'Pagada' : 'Pendiente'}</td></tr>)}</tbody></table>{!cuotas.length && <p className="empty">Sin compras en cuotas.</p>}</div>}
    {tab === 'corte' && (listado ? <div className="table-scroll"><p style={{ padding: 16 }}>Corte: {listado.corte.replace('T', ' ')} · Pago: {listado.fechaPago} · Total guardado: {listado.total} {listado.moneda}. La mora se recalcula al pagar.</p><table className="tbl"><caption>Listado persistido del corte</caption><thead><tr><th>Operación</th><th>Compra</th><th>Detalle</th><th>Vence</th><th>Días</th><th>Tasa</th><th>Concepto</th><th>Importe</th></tr></thead><tbody>{listado.lineas.map((o, i) => <tr key={i}><td>{o.obligacionId}</td><td>{o.fechaCompra}</td><td>{o.detalle}</td><td>{o.vencimiento ?? '—'}</td><td>{o.dias ?? '—'}</td><td>{o.tasa ? `${o.baseTasa} ${pct7(D(o.tasa))}` : '—'}</td><td>{o.concepto}</td><td>{num(D(o.importe))}</td></tr>)}</tbody></table></div> : <p className="empty">El corte aún no se ha emitido. Se genera automáticamente al llegar la fecha y hora de corte, con el servicio en funcionamiento.</p>)}
    </div>
    <div className="card table-scroll"><table className="tbl"><caption>Pagos registrados del cliente</caption><thead><tr><th>Constancia</th><th>Fecha</th><th>Capital</th><th>Interés</th><th>Mora</th><th>Abono</th></tr></thead><tbody>{pagos.filter(p => p.clienteId === c.id).map(p => <tr key={p.constancia}><td>{p.constancia}</td><td>{p.fecha ?? 'Registro anterior'}</td><td>{p.capital}</td><td>{p.comp ?? '—'}</td><td>{p.mora ?? '—'}</td><td>{p.abono ?? '—'}</td></tr>)}{!pagos.some(p => p.clienteId === c.id) && <tr><td colSpan={6} className="empty">Aún no hay pagos registrados.</td></tr>}</tbody></table></div>
  </>;
}
