import type { ListadoCorte, Obligacion, Pago } from '../../contexts/billing-and-collections/dominio/modelos';
import type { Venta } from '../../contexts/credit-origination/dominio/modelos';
import type { Cliente } from '../../contexts/customer-management/dominio/modelos';
import type { Cuenta, Tienda } from '../../contexts/identity-and-access/dominio/modelos';
import type { Producto } from '../../contexts/product-catalog/dominio/modelos';
export interface Datos {
    finanzasVersion?: number;
    obligaciones?: Obligacion[];
    listados?: ListadoCorte[];
    tiendas: Tienda[];
    cuentas: Cuenta[];
    clientes: Cliente[];
    productos: Producto[];
    ventas: Venta[];
    pagos: Pago[];
    auditoria: {
        fecha: string;
        actor: string;
        accion: string;
    }[];
}
