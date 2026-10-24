import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSesion } from './session';
import { api } from './api';
import type { ListadoCorte, Obligacion, Pago } from '../../contexts/billing-and-collections/dominio/modelos';
import { deudaLinea, liquidarObligaciones } from '../../contexts/billing-and-collections/dominio/obligaciones';
import type { Venta } from '../../contexts/credit-origination/dominio/modelos';
import type { Cliente } from '../../contexts/customer-management/dominio/modelos';
import type { Rol, Sesion, Tienda } from '../../contexts/identity-and-access/dominio/modelos';
import type { Producto } from '../../contexts/product-catalog/dominio/modelos';
import type { Datos } from '../../shared/dominio/datos';
import { Decimal } from '../../shared/dominio/decimal';
interface Store {
    listo: boolean;
    errorBase: string;
    tiendas: Tienda[];
    tienda?: Tienda;
    autenticar: (rol: Rol, correo: string, clave: string) => Promise<Sesion>;
    guardarTienda: (t: Tienda, clave?: string) => Promise<void>;
    clientes: Cliente[];
    guardarCliente: (c: Cliente, clave?: string) => Promise<void>;
    productos: Producto[];
    agregarProducto: (p: Producto) => Promise<void>;
    ventas: Venta[];
    registrarVenta: (v: Omit<Venta, 'id'>) => Promise<Venta>;
    pagos: Pago[];
    registrarPago: (p: Pago) => Promise<void>;
    obligaciones: Obligacion[];
    listados: ListadoCorte[];
    liquidarDe: (c: Cliente, periodo: string, fecha: string) => ReturnType<typeof liquidarObligaciones>;
    emitirListado: (clienteId: number, periodo: string) => Promise<ListadoCorte>;
    registrarCobro: (pedido: {
        clienteId: number;
        periodo: string;
        fecha: string;
        hora?: string;
        abono: string;
    }) => Promise<Pago>;
    deudaDe: (c: Cliente) => Decimal;
}
const VACIO: Datos = { tiendas: [], cuentas: [], clientes: [], productos: [], ventas: [], pagos: [], auditoria: [] };
const Ctx = createContext<Store | null>(null);
export function useStore() {
    const store = useContext(Ctx);
    if (!store) throw new Error('Store');
    return store;
}
export const deudaCliente = (d: Datos, c: Cliente) => deudaLinea(d, c);
export function StoreProvider({ children }: {
    children: ReactNode;
}) {
    const { sesion } = useSesion();
    const [datos, setDatos] = useState<Datos>(VACIO);
    const [listo, setListo] = useState(false);
    const [errorBase, setError] = useState('');
    const generacion = useRef(0);
    const solicitud = useRef(0);
    useEffect(() => {
        let vivo = true;
        api('salud').then(() => {
            if (vivo) setListo(true);
        }).catch(() => {
            if (vivo) setError('No se pudo conectar con CrediLocal. Compruebe que el servidor esté iniciado.');
        });
        return () => { vivo = false; };
    }, []);
    useEffect(() => {
        const version = ++generacion.current;
        if (!sesion) {
            setDatos(VACIO);
            return;
        }
        const actualizar = async () => {
            const numero = ++solicitud.current;
            try {
                const actualizados = await api<Datos>('estado');
                if (generacion.current === version && numero === solicitud.current) {
                    setDatos(actualizados);
                    setError('');
                }
            } catch (error) {
                if (generacion.current === version) setError((error as Error).message);
            }
        };
        void actualizar();
        const id = window.setInterval(actualizar, 5000);
        window.addEventListener('focus', actualizar);
        return () => {
            generacion.current++;
            window.clearInterval(id);
            window.removeEventListener('focus', actualizar);
        };
    }, [sesion]);
    const ejecutar = async <T,>(accion: string, pedido: unknown): Promise<T> => {
        const version = generacion.current;
        const respuesta = await api<{ resultado: T; datos: Datos }>('operacion', { accion, pedido });
        solicitud.current++;
        if (version === generacion.current) setDatos(respuesta.datos);
        return respuesta.resultado;
    };
    const value: Store = {
        listo,
        errorBase,
        tiendas: datos.tiendas,
        tienda: datos.tiendas.find(t => t.id === sesion?.tiendaId),
        autenticar: async (rol, correo, clave) => {
            const respuesta = await api<{ sesion: Sesion; datos: Datos }>('login', { rol, correo, clave });
            solicitud.current++;
            setDatos(respuesta.datos);
            return respuesta.sesion;
        },
        guardarTienda: async (registro, clave) => { await ejecutar('GUARDAR TIENDA', { registro, clave }); },
        guardarCliente: async (registro, clave) => { await ejecutar('GUARDAR CLIENTE', { registro, clave }); },
        agregarProducto: async (registro) => { await ejecutar('GUARDAR PRODUCTO', { registro }); },
        registrarVenta: v => ejecutar<Venta>('REGISTRAR VENTA', v),
        registrarPago: async (p) => { await ejecutar('REGISTRAR PAGO', p); },
        registrarCobro: p => ejecutar<Pago>('REGISTRAR PAGO', p),
        emitirListado: (clienteId, periodo) => ejecutar<ListadoCorte>('EMITIR CORTE', { clienteId, periodo }),
        clientes: datos.clientes,
        productos: datos.productos,
        ventas: datos.ventas,
        pagos: datos.pagos,
        obligaciones: datos.obligaciones ?? [],
        listados: datos.listados ?? [],
        deudaDe: c => deudaLinea(datos, c),
        liquidarDe: (c, periodo, fecha) => liquidarObligaciones(datos, c, periodo, fecha)
    };
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
