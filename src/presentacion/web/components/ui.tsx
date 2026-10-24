import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { num, sol } from '../format';
import { AYUDA } from '../ayuda';
import { D, Decimal } from '../../../shared/dominio/decimal';
export const idx = (i: number): CSSProperties => ({ ['--i' as string]: i });
export const tipId = (id: string) => `${id}-tip`;
/** Campo con etiqueta, tooltip (capa 1) y panel de ayuda ampliada (capa 2). */
export function Field({ id, label, help, helpText, error, children }: {
    id: string;
    label: string;
    help?: string;
    helpText?: string;
    error?: string;
    children: ReactNode;
}) {
    const [abierta, setAbierta] = useState(false);
    const a = help && AYUDA[help] ? AYUDA[help] : [helpText ?? `Ingrese o seleccione ${label.toLowerCase()} para esta operación.`, helpText ?? `Revise ${label.toLowerCase()} antes de guardar. Los errores de validación se muestran debajo del campo.`, label];
    return (<div onKeyDown={(e) => { if (e.key === 'Escape')
        setAbierta(false); }}>
      <label className="lbl" htmlFor={id}>
        {label}
        {a && (<span className="hp">
            <button type="button" className="hb" aria-label={`Ayuda: ${label}`} aria-expanded={abierta} aria-controls={`${id}-panel`} aria-describedby={tipId(id)} onClick={() => setAbierta((v) => !v)}>?</button>
            <span role="tooltip" id={tipId(id)} className="tip">{a[0]}</span>
          </span>)}
      </label>
      {children}
      {error && <div className="err-msg" id={`${id}-err`} role="alert">{error}</div>}
      {a && (<div className={`collapse${abierta ? ' open' : ''}`} id={`${id}-panel`} role="region" aria-label="Ayuda ampliada" aria-hidden={!abierta}>
          <div><div className="assist"><b>{a[2]}</b>{a[1]}</div></div>
        </div>)}
    </div>);
}
export function Seg<T extends string>({ value, options, onChange, label }: {
    value: T;
    options: T[];
    onChange: (v: T) => void;
    label: string;
}) {
    return (<div className="seg" role="group" aria-label={label}>
      {options.map((o) => (<button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>))}
    </div>);
}
export function Badge({ tone = '', children }: {
    tone?: 'ok' | 'warn' | 'bad' | 'info' | '';
    children: ReactNode;
}) {
    return <span className={`badge ${tone}`}>{children}</span>;
}
export function Head({ title, sub, children }: {
    title: string;
    sub?: string;
    children?: ReactNode;
}) {
    return (<div className="head rv">
      <div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>
      {children}
    </div>);
}
/** Valor que se marca con un destello cada vez que cambia. */
export function Tick({ value, className = '' }: {
    value: string;
    className?: string;
}) {
    return <span key={value} className={`num tick ${className}`}>{value}</span>;
}
/**
 * Importe con conteo animado (Odómetro / Counter Ticker). La animación es solo de
 * presentación: el valor final siempre se pinta desde el Decimal exacto, nunca desde el número interpolado.
 */
export function Money({ value, moneda = true, divisa = 'PEN' }: {
    value: Decimal;
    moneda?: boolean;
    divisa?: string;
}) {
    const meta = value.toNumber();
    const [v, setV] = useState(meta);
    const desde = useRef(meta);
    useEffect(() => {
        if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
            desde.current = meta;
            setV(meta);
            return;
        }
        const t0 = performance.now(), a = desde.current;
        let raf = 0;
        const paso = (t: number) => {
            const p = Math.min(1, (t - t0) / 600);
            const cur = a + (meta - a) * (1 - Math.pow(1 - p, 3));
            desde.current = cur;
            setV(cur);
            if (p < 1)
                raf = requestAnimationFrame(paso);
        };
        raf = requestAnimationFrame(paso);
        return () => cancelAnimationFrame(raf);
    }, [meta]);
    const fin = Math.abs(v - meta) < 0.005;
    const txt = fin ? (moneda ? sol(value, divisa) : num(value)) : (moneda ? (divisa === 'USD' ? 'US$ ' : 'S/ ') : '') + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return <span className="num odometer">{txt}</span>;
}
/**
 * Visualizador interactivo de imputación por prelación de pagos (Art. 1257 C.C.).
 * Muestra el llenado secuencial de depósitos: 1.° Mora -> 2.° Compensatorio -> 3.° Capital.
 */
export function PrelacionFlow({ moraDeuda, moraImp, compDeuda, compImp, capDeuda, capImp, }: {
    moraDeuda: Decimal;
    moraImp: Decimal;
    compDeuda: Decimal;
    compImp: Decimal;
    capDeuda: Decimal;
    capImp: Decimal;
}) {
    const calcPct = (imp: Decimal, d: Decimal) => d.gt(0) ? Math.min(100, Math.max(0, imp.div(d).mul(100).toNumber())) : 100;
    const pctMora = calcPct(moraImp, moraDeuda);
    const pctComp = calcPct(compImp, compDeuda);
    const pctCap = calcPct(capImp, capDeuda);
    const tanks = [
        { orden: '1.°', name: 'Interés Moratorio', deuda: moraDeuda, imp: moraImp, pct: pctMora, cls: 'mora' },
        { orden: '2.°', name: 'Interés Compensatorio', deuda: compDeuda, imp: compImp, pct: pctComp, cls: 'comp' },
        { orden: '3.°', name: 'Capital Principal', deuda: capDeuda, imp: capImp, pct: pctCap, cls: 'cap' },
    ];
    return (<div className="prelacion-flow rv">
      <div className="prelacion-header">
        <div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Flujo de Prelación Legal (Art. 1257 C.C.)</span>
          <p className="sub" style={{ fontSize: 12 }}>El dinero llena secuencialmente cada concepto hasta extinguirlo antes de pasar al siguiente.</p>
        </div>
        <Badge tone={pctCap === 100 && pctComp === 100 && (moraDeuda.isZero() || pctMora === 100) ? 'ok' : 'warn'}>
          {pctCap === 100 && pctComp === 100 ? 'Obligación 100% Extinguida' : 'Imputación en Proceso'}
        </Badge>
      </div>

      <div className="prelacion-grid">
        {tanks.map((t) => {
            const sinDeuda = t.deuda.isZero();
            const completado = t.pct >= 99.99;
            return (<div key={t.orden} className={`prelacion-tank ${sinDeuda ? 'zero' : completado ? 'full' : 'active'}`}>
              <div className="prelacion-tank-badge">
                <span style={{ color: 'var(--ink)' }}>{t.orden} {t.name}</span>
                <span className="num" style={{ color: completado ? 'var(--ok)' : sinDeuda ? 'var(--muted)' : 'var(--accent-ink)' }}>
                  {sinDeuda ? 'Sin deuda' : `${Math.round(t.pct)}%`}
                </span>
              </div>
              <div className="prelacion-tank-bar">
                <div className={`prelacion-tank-fill ${t.cls} ${completado ? 'complete' : ''}`} style={{ width: `${sinDeuda ? 0 : t.pct}%` }}/>
              </div>
              <div className="prelacion-tank-watermark">
                <span>Imputado: <b className="num">{num(t.imp)}</b></span>
                <span>Exigible: <span className="num">{num(t.deuda)}</span></span>
              </div>
            </div>);
        })}
      </div>
    </div>);
}
/**
 * Barra reactiva de capacidad de crédito con gradiente y umbrales normados:
 * - < 70% de utilización: Verde (Capacidad saludable)
 * - 70% - 90%: Ámbar (Alerta de capacidad)
 * - > 90%: Rojo (Cupo crítico / Excedido)
 */
export function CreditMeter({ limite, deudaActual, montoPendiente, divisa = 'PEN', }: {
    limite: Decimal;
    deudaActual: Decimal;
    montoPendiente?: Decimal;
    divisa?: string;
}) {
    const p = montoPendiente ?? D(0);
    const total = deudaActual.plus(p);
    const usoActualPct = limite.gt(0) ? Math.min(100, Math.max(0, deudaActual.div(limite).mul(100).toNumber())) : 0;
    const pendingPct = limite.gt(0) ? Math.min(100 - usoActualPct, Math.max(0, p.div(limite).mul(100).toNumber())) : 0;
    const totalUsoPct = limite.gt(0) ? total.div(limite).mul(100).toNumber() : 0;
    let color = 'var(--ok)';
    let estadoText = 'Capacidad óptima (<70%)';
    if (totalUsoPct > 90) {
        color = 'var(--bad)';
        estadoText = 'Capacidad crítica / Límite (>90%)';
    }
    else if (totalUsoPct >= 70) {
        color = 'var(--warn)';
        estadoText = 'Uso moderado / Precaución (70%-90%)';
    }
    const saldoRestante = limite.minus(total);
    const disp = saldoRestante.isNegative() ? D(0) : saldoRestante;
    return (<div className="credit-meter">
      <div className="credit-legend">
        <span className="credit-chip" style={{ color }}>{estadoText}</span>
        <span>
          Uso: <b className="num">{Math.round(totalUsoPct)}%</b> · Disponible: <b className="num"><Money value={disp} divisa={divisa}/></b>
        </span>
      </div>
      <div className="credit-meter-bar" role="meter" aria-valuenow={Math.round(totalUsoPct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="credit-meter-used" style={{ width: `${usoActualPct}%`, background: color }}/>
        {pendingPct > 0 && <div className="credit-meter-pending" style={{ width: `${pendingPct}%` }} title="Compra en curso"/>}
      </div>
    </div>);
}
