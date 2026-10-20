import { useMemo, useState } from 'react';
import { useSesion } from '../session';
import { useStore } from '../store';
import { D, convertirTasas, fmtFecha, generarCronogramaFrances, parseFecha } from '../../../dominio/credito/motor';
import { num, sol as dinero } from '../format';
import { Badge, Field, Head, Money, idx } from '../components/ui';
import { ChevronDownIcon } from '../components/Icons';
/** Vista del cliente: el cronograma de su propio financiamiento en cuotas, si tiene uno. Solo lectura. */
export function MiCronograma() {
    const { sesion } = useSesion();
    const { clientes, ventas, obligaciones } = useStore();
    const [ventaId, setVentaId] = useState<number | null>(null);
    const [abierta, setAbierta] = useState<number | null>(null);
    const cl = clientes.find(c => c.id === sesion!.clienteId)!;
    const propias = ventas.filter(v => v.clienteId === cl.id && v.modalidad === 'Cuotas');
    const venta = propias.find(v => v.id === ventaId) ?? propias[0];
    const moneda = venta?.condiciones?.moneda ?? cl.moneda;
    const sol = (d: Parameters<typeof dinero>[0]) => dinero(d, moneda);
    const cro = useMemo(() => {
        if (!venta)
            return null;
        const a = venta.condiciones ?? cl;
        const t = convertirTasas(a.tipoC, a.valC, a.capC);
        return generarCronogramaFrances({ capital: D(venta.capital), fechaCompra: parseFecha(venta.fecha), hora: venta.hora, horaCorte: venta.horaCorte ?? cl.horaCorte, diaCorte: a.diaCorte, diaPago: a.diaPago, ted: t.ted, tem: t.tem, nMeses: venta.n });
    }, [venta, cl]);
    const toggleRow = (k: number) => {
        setAbierta((prev) => (prev === k ? null : k));
    };
    return (<>
      <Head title="Mi cronograma" sub="Financiamiento en cuotas por el método francés vencido simple ordinario, con gracia total capitalizada. Pulse cualquier fila para ver el desglose."/>

      {propias.length > 1 && <Field id="financiamiento" label="Financiamiento" helpText="Seleccione la compra cuyo cronograma desea consultar."><select id="financiamiento" className="in" value={venta?.id} onChange={e => { setVentaId(+e.currentTarget.value); setAbierta(null); }}>{propias.map(v => <option key={v.id} value={v.id}>OP-{v.id} · {v.detalle}</option>)}</select></Field>}
      {venta && <p>{obligaciones.filter(o => o.ventaId === venta.id && o.pagada).length} cuotas pagadas.</p>}
      {!venta || !cro ? (<div className="card empty rv"><div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Sin financiamiento en cuotas</div>Actualmente no tiene compras financiadas a plazos. Sus compras a fin de mes aparecen en «Mi estado de cuenta».</div>) : (<>
        <div className="rv" style={{ ...idx(1), display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="stat"><div className="t">Capital original</div><div className="v"><Money divisa={moneda} value={D(venta.capital)}/></div></div>
          <div className="stat"><div className="t">Días de gracia</div><div className="v">{cro.diasGracia}</div></div>
          <div className="stat hl"><div className="t">Cuota mensual constante</div><div className="v"><Money divisa={moneda} value={cro.cuotaFija}/></div></div>
          <div className="stat"><div className="t">Total de intereses</div><div className="v"><Money divisa={moneda} value={cro.totalIntereses}/></div></div>
        </div>

        <div className="card flat rv" style={idx(2)}>
          <table className="tbl">
            <caption className="sr">Cronograma de amortización francés</caption>
            <thead><tr><th scope="col">N.°</th><th scope="col">Fecha</th><th scope="col">Gracia</th><th scope="col" className="r">Saldo inicial</th><th scope="col" className="r">Interés</th><th scope="col" className="r">Cuota</th><th scope="col" className="r">Amortización</th><th scope="col" className="r">Saldo final</th></tr></thead>
            <tbody>{cro.filas.map((x, i) => {
                const isOpen = abierta === x.k;
                const cuotaNum = x.cuota.toNumber();
                const amortPct = cuotaNum > 0 ? Math.min(100, Math.max(0, (x.amortizacion.toNumber() / cuotaNum) * 100)) : 0;
                const intPct = cuotaNum > 0 ? Math.min(100, Math.max(0, (x.interes.toNumber() / cuotaNum) * 100)) : 0;
                return (<>
                  <tr key={`mi-row-${x.k}`} className={`row-in cron-row ${isOpen ? 'open' : ''}`} style={{ ...idx(i), background: x.k === 0 ? 'var(--accent-soft)' : undefined }} onClick={() => toggleRow(x.k)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleRow(x.k);
                } }} aria-expanded={isOpen}>
                    <td className="num" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{x.k}</span>
                      <span className="cron-chevron" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <ChevronDownIcon size={12}/>
                      </span>
                    </td>
                    <td className="num">{fmtFecha(x.fecha)}</td>
                    <td>{x.gracia}</td>
                    <td className="r num">{num(x.saldoInicial)}</td>
                    <td className="r num">{x.k === 0 ? `(${num(x.interes)})` : num(x.interes)}</td>
                    <td className="r num">{num(x.cuota)}</td>
                    <td className="r num">{num(x.amortizacion)}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>{num(x.saldoFinal)}</td>
                  </tr>
                  <tr key={`mi-detail-${x.k}`} style={{ background: 'transparent' }}>
                    <td colSpan={8} style={{ padding: 0, border: 0 }}>
                      <div className={`accordion-wrapper ${isOpen ? 'expanded' : ''}`}>
                        <div className="accordion-inner">
                          <div className="quota-breakdown">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>
                                {x.k === 0 ? 'Período de Gracia Total Capitalizable' : `Composición de la Cuota #${x.k}`}
                              </span>
                              <span className="sub" style={{ fontSize: 12 }}>
                                {x.k === 0 ? `Capitalización: P_cap = P · (1 + TED)^${x.diasPeriodo}` : `Amortización: ${sol(x.amortizacion)} · Interés: ${sol(x.interes)}`}
                              </span>
                            </div>

                            {x.k > 0 && (<>
                                <div className="quota-stack-bar" role="meter" aria-label="Composición amortización vs interés">
                                  <div className="quota-stack-amort" style={{ width: `${amortPct}%` }} title={`Amortización: ${Math.round(amortPct)}%`}/>
                                  <div className="quota-stack-interes" style={{ width: `${intPct}%` }} title={`Interés: ${Math.round(intPct)}%`}/>
                                </div>
                                <div className="quota-chips">
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#2563eb' }}/>
                                    Amortización: <b>{num(x.amortizacion)}</b> ({Math.round(amortPct)}%)
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#d97706' }}/>
                                    Interés: <b>{num(x.interes)}</b> ({Math.round(intPct)}%)
                                  </span>
                                  <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
                                    Saldo pendiente posterior: <b className="num">{sol(x.saldoFinal)}</b>
                                  </span>
                                </div>
                              </>)}

                            {x.k === 0 && (<div className="quota-chips">
                                <span>Capital inicial: <b className="num">{sol(x.saldoInicial)}</b></span>
                                <span>Interés capitalizado: <b className="num" style={{ color: 'var(--warn)' }}>{sol(x.interes)}</b></span>
                                <span>Saldo al inicio de cuotas: <b className="num" style={{ color: 'var(--accent-ink)' }}>{sol(x.saldoFinal)}</b></span>
                              </div>)}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </>);
            })}</tbody>
            <tfoot><tr><td colSpan={4}>Totales</td><td className="r num">{num(cro.totalIntereses)}</td><td className="r num">{num(cro.totalCuotas)}</td><td className="r num">{num(cro.totalAmortizado)}</td><td /></tr></tfoot>
          </table>
        </div>
        <Badge tone={cro.cierra ? 'ok' : 'bad'}>{cro.cierra ? `Saldo final ${sol(cro.filas[cro.filas.length - 1].saldoFinal)}: su deuda se extingue sin residuo` : 'El cronograma no cierra en S/ 0.00'}</Badge>
      </>)}
    </>);
}
