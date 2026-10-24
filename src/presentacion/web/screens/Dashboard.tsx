import { useStore } from '../store';
import { num } from '../format';
import { Head, Badge } from '../components/ui';
import { D } from '../../../shared/dominio/decimal';
export function Dashboard() {
    const { tienda, clientes, productos, ventas, pagos, deudaDe } = useStore();
    return <>
    <Head title={`Bienvenido, ${tienda?.nombre ?? 'Comercio'}`} sub="Resumen de los datos registrados en esta tienda."><a className="btn pri" href="#/venta">Nueva venta a crédito</a></Head>
    <div className="form-grid">
      {(['PEN', 'USD'] as const).map(moneda => {
            const cs = clientes.filter(c => c.moneda === moneda);
            const deuda = cs.reduce((a, c) => a.plus(deudaDe(c)), D(0));
            const linea = cs.filter(c => c.activo !== false).reduce((a, c) => a.plus(c.limite), D(0));
            return <section key={moneda} className="card"><h2>{moneda === 'PEN' ? 'Soles (PEN)' : 'Dólares (USD)'}</h2><div className="kv"><span>Cartera</span><b className="num">{num(deuda)}</b></div><div className="kv"><span>Línea autorizada activa</span><span className="num">{num(linea)}</span></div><div className="kv"><span>Clientes</span><span className="num">{cs.length}</span></div></section>;
        })}
      <section className="card"><h2>Actividad registrada</h2><p>{clientes.filter(c => c.activo !== false).length} clientes activos</p><p>{productos.filter(p => p.activo !== false).length} productos activos</p><p>{ventas.length} ventas · {pagos.length} pagos</p></section>
    </div>
    <div className="table-scroll"><table className="tbl"><caption>Cuentas de clientes</caption><thead><tr><th>Cliente</th><th>Estado</th><th>Moneda</th><th>Límite</th><th>Capital pendiente</th></tr></thead><tbody>{clientes.map(c => <tr key={c.id}><td>{c.nombre}</td><td><Badge tone={c.activo === false ? 'bad' : 'ok'}>{c.activo === false ? 'De baja' : 'Activo'}</Badge></td><td>{c.moneda}</td><td>{num(D(c.limite))}</td><td>{num(deudaDe(c))}</td></tr>)}</tbody></table></div>
    <div className="table-scroll"><table className="tbl"><caption>Ventas registradas</caption><thead><tr><th>Operación</th><th>Cliente</th><th>Fecha y hora</th><th>Detalle</th><th>Modalidad</th><th>Capital</th></tr></thead><tbody>{ventas.map(v => <tr key={v.id}><td>OP-{v.id}</td><td>{clientes.find(c => c.id === v.clienteId)?.nombre}</td><td>{v.fecha} {v.hora ?? '—'}</td><td>{v.detalle}</td><td>{v.modalidad}</td><td>{num(D(v.capital))} {v.condiciones?.moneda ?? clientes.find(c => c.id === v.clienteId)?.moneda}</td></tr>)}</tbody></table></div>
    {!clientes.length && <p className="empty">Esta tienda está vacía. Comience registrando sus clientes y productos.</p>}
  </>;
}
