# CrediLocal

Sistema académico de crédito comercial para varias tiendas. Incluye clientes, productos con imagen, ventas a fin de mes o en cuotas, cronogramas franceses, intereses, mora, cortes y cobranza completa de la deuda exigible.

Tecnologías: **React 18, TypeScript, Vite 6, Node.js y SQLite**. Los cálculos usan `decimal.js` con 40 dígitos significativos. El código se organiza en cinco contextos de negocio inspirados en DDD dentro de un único servicio.

## Instalar y ejecutar

Requisitos: **Node.js 24.15 o superior**, npm y acceso al registro npm para instalar dependencias. También se puede descargar con **Code → Download ZIP** y extraerlo, en vez de clonar.

```bash
git clone https://github.com/pieroedeveloper25/credilocal.git
cd credilocal
npm ci
npm run build
npm start
```

Abrir **http://127.0.0.1:3000**. Mantener la terminal abierta y detener con Ctrl+C. En Windows se puede usar `INICIAR_CrediLocal.cmd` después de compilar.

Este repositorio contiene fuentes: `dist`, `servidor-dist` y `node_modules` se generan localmente. Después de modificar código hay que reconstruir y reiniciar. En el primer inicio se crea `datos/credilocal.sqlite` con datos ficticios; los siguientes conservan las operaciones. La base de uso no está publicada.

## Accesos de demostración

Contraseña de todos: **`credi2026`**. Seleccionar el perfil correspondiente.

| Perfil | Correo | Acceso |
|---|---|---|
| Superadministrador | sistema@credilocal.pe | Administrar tiendas |
| Comercio | admin@sutaller.pe | Clientes, catálogo, ventas, cobros y consultas de su tienda |
| Cliente | contacto@transintegrales.pe | Consultar su estado y cronograma |
| Cliente | autopartes@demo.pe | Consultar su estado y cronograma |

Son cuentas ficticias. Recargar la página solicita ingresar nuevamente; las operaciones permanecen guardadas. Cerrar sesión o reiniciar el servidor invalida la sesión, que también vence a las ocho horas.

## Funcionalidades

- Alta, edición y baja de tiendas, clientes y productos, conservando su historia.
- Condiciones de crédito por cliente: moneda, línea, tasas, plazo, corte y pago.
- Imagen obligatoria JPG o PNG de hasta 2 MB, carga, vista previa, miniaturas y reemplazo al editar.
- Ventas con productos del catálogo y comprobación de la línea disponible en el servidor.
- Crédito a fin de mes y cuotas francesas con el tratamiento de gracia implementado.
- Liquidación separada de capital, compensatorio y mora; pagos completos, sin parciales ni excedentes.
- Listados al corte, constancias y portal de cliente con acceso solo a su cuenta.
- Ayuda de campos, vista móvil y selector de tema claro u oscuro.

## Organización del código

```text
src/
  contexts/
    identity-and-access/       # Tiendas, cuentas, perfiles y sesiones
    customer-management/      # Clientes, condiciones y línea de crédito
    product-catalog/          # Productos, precios, imágenes y modalidades
    credit-origination/       # Venta, tasas, gracia y cronograma
    billing-and-collections/  # Deuda, mora, pagos y cortes
  shared/
    dominio/                  # Decimal, fechas, validaciones y tipos compartidos
    aplicacion/               # Contratos, unidad de trabajo y bus de eventos
  aplicacion/                 # Composición y autorización de casos de uso
  infraestructura/            # HTTP, SQLite, demostración y migración
  presentacion/web/           # Pantallas, componentes y acceso a la API
  main.tsx                    # Entrada de React
servidor/main.ts               # Composición y arranque del servicio
pruebas/                       # Integración HTTP y límites de arquitectura
scripts/                       # Compilación y migración
```

`VentaCreditoRegistrada` crea obligaciones y compromete la línea del cliente. `CapitalAmortizado` actualiza su saldo pendiente después del cobro. El bus es síncrono: sus suscriptores terminan dentro de la unidad de trabajo antes del guardado SQLite.

Los contextos comparten `Datos` y la persistencia. SQLite conserva nueve colecciones JSON y metadatos con guardado transaccional. Es un monolito modular, no contextos desplegados con bases independientes. Ejecutar una sola instancia del servidor por base.

## Reglas financieras

- Tasas anuales nominales o efectivas convertidas a TED y TEM, con año 360 y mes financiero de 30 días.
- Días calendario para los intervalos de gracia y mora; la hora del corte determina el ciclo de una compra del mismo día.
- Importes redondeados a centavos con `ROUND_HALF_UP` en las etapas del algoritmo; la última cuota ajusta el saldo a cero.
- En cuotas, las compras anteriores o iguales al corte capitalizan gracia hasta el día de pago de ese mes. Las posteriores no incorporan ese tramo. En ambos casos, la primera cuota vence el mes siguiente a la compra.
- Mora sobre capital y compensatorio exigibles. El pago se distribuye en mora, compensatorio y capital.
- Las ventas conservan sus condiciones pactadas. La gracia capitalizada no consume línea adicional.

Los datos ficticios incluyen la compra de 1200.00 con pago histórico al 30/09/2026 por 1214.88 y el financiamiento de 4500.00 con capital ajustado 4536.22 y cuota de referencia 1579.41. Otras fechas cambian la liquidación. El cliente del segundo caso también tiene compras previas; su deuda completa no equivale a una sola cuota.

## Pruebas y desarrollo

```bash
npm test
npm run test:arquitectura
npm run build
npm run test:api
npm run test:demo
```

La versión corregida se comprobó con **50 pruebas unitarias, 4 de arquitectura, 8 de API y 4 de demostración**. Las pruebas HTTP usan bases ficticias separadas en `pruebas/base-prueba-*`. También se verificaron la carga PNG, el reemplazo JPG, la edición, la recarga y la vista móvil en navegador.

`build` comprueba tipos del navegador y la lógica compartida, compila React y empaqueta Node con esbuild. Los adaptadores Node se ejercitan mediante integración; el proyecto no configura una comprobación completa de sus tipos con tsc.

Para editar pantallas con recarga automática, mantener el backend en 3000 y ejecutar en otra terminal:

```bash
npm run dev
```

Usar la URL que indique Vite; su proxy envía `/api` al puerto 3000. `npm run preview` no sustituye el servidor completo.

## Acceso desde otros equipos

Para compartir operaciones, todos deben conectarse a un mismo servidor. En PowerShell, en el equipo que lo hospeda:

```powershell
$env:HOST='0.0.0.0'
$env:PORT='3000'
npm start
```

Los demás abren `http://IP_DEL_SERVIDOR:3000`. Comprobar la IP con `ipconfig`, la red y el firewall. `127.0.0.1` apunta al propio equipo. Cada instalación independiente crea su propia base.

Los cortes se revisan cada 30 segundos, al arrancar y después de las operaciones. Funcionan sin navegadores mientras el servicio siga encendido; recupera pendientes al reiniciar.

GitHub publica el código, no despliega la aplicación. Un alojamiento público requiere Node compatible, HTTPS, cookie adecuada y almacenamiento persistente para SQLite. Un alojamiento exclusivo de archivos estáticos no basta.

## Respaldo y migración

Detener el servidor y copiar `datos/credilocal.sqlite` para respaldar. Antes de restaurar, conservar la base actual y reemplazarla con el servicio detenido. `CREDILOCAL_DB` permite elegir otra ruta.

La migración desde IndexedDB es opcional. `scripts/exportar-indexeddb.js` descarga el respaldo desde el navegador y origen anteriores. El destino del importador debe ser un archivo nuevo dentro de un directorio existente:

```powershell
node scripts/importar-base.mjs respaldo.json datos/importada.sqlite
$env:CREDILOCAL_DB='datos/importada.sqlite'
npm start
```

No se migran bases personales automáticamente. Mantener los respaldos fuera del repositorio.

## Base de demostración poblada

Después de instalar y compilar, generar una base independiente y ejecutarla:

```bash
npm run demo:crear
npm run demo:iniciar
```

Abrir http://127.0.0.1:3000. Se utilizan `datos/demo.sqlite` y los recursos locales de `recursos/demo`. La base normal `datos/credilocal.sqlite` permanece separada. El comando de carga **rechaza sobrescribir un archivo existente** y el inicio de demostración rechaza bases normales.

Para repetir el ensayo en otra base y con una fecha de referencia fija:

```bash
npm run demo:crear -- --destino datos/ensayo2.sqlite --fecha 2026-10-24
npm run demo:iniciar -- datos/ensayo2.sqlite
```

La fecha debe estar entre 2026-10-01 y la fecha actual de Lima; no se cambia el reloj ni se registran operaciones futuras. La base se crea con fechas relativas a esa referencia; posteriormente la aplicación liquida según la fecha consultada. Las contraseñas ficticias son `credi2026`.

La carga contiene dos tiendas, tres clientes por tienda, cuatro productos reales por tienda y nueve cuentas. Conserva los casos históricos de 1214.88 y 1579.41 como operaciones registradas. El catálogo nuevo sirve para nuevas ventas; no cambia esos importes históricos.

| Perfil de demostración | Correo | Recorrido |
|---|---|---|
| Comercio del taller | admin@sutaller.pe | Casos históricos y cuatro productos automotrices |
| Cliente del caso a fin de mes | cliente.taller@credilocal.test | Compra histórica de 1200.00 |
| Comercio de la bodega | bodega@credilocal.test | Tres clientes y cuatro productos de abarrotes |
| Cliente Ana | ana@credilocal.test | Pago completo dentro del plazo, sin mora |
| Cliente Pedro | pedro@credilocal.test | Compra vencida con mora |
| Cliente Rosa | rosa@credilocal.test | Línea de 80.00, capital pendiente 72.80 y disponible 7.20 |

También siguen funcionando el superadministrador y los otros dos accesos de cliente del taller indicados arriba. Los datos de tiendas, personas, documentos, precios a crédito y operaciones son ficticios.

Con Rosa, intentar vender dos bolsas de arroz a crédito permite demostrar el rechazo por línea insuficiente. Para un pago, utilizar el total de la liquidación de la fecha elegida: el servidor rechaza parciales y excedentes. Ana tiene un pago por 55.65 registrado el día 26 del mes anterior a la referencia; los cortes y la mora de Pedro se pueden consultar en ese período y el actual.

### Productos precios e imágenes de referencia

El catálogo usa productos reales de Castrol, Prestone, WD-40, Paisana, Primor, Tottus y Don Vittorio. Las referencias de precio regular, posibles promociones, URL y método de consulta del 24/10/2026 están en [catalogo.json](recursos/demo/catalogo.json). Son referencias observadas, algunas de fichas oficiales indexadas; no se promete precio vigente en carrito ni disponibilidad. El precio a crédito es un supuesto propio de la tienda ficticia, no una financiación ofrecida por el vendedor consultado.

Las fotografías de Wikimedia Commons son **referenciales de la categoría o marca**, no necesariamente del envase o presentación exactos. No se copiaron fotografías comerciales sin permiso. Sus autores, fuentes, licencias Creative Commons o declaración de dominio público están en [imagenes.json](recursos/demo/imagenes.json), y las atribuciones se muestran junto a las imágenes del catálogo. Las miniaturas se descargaron de Commons sin cambios locales; cada fotografía conserva su licencia indicada, incluidas las condiciones de compartir igual cuando correspondan.

Los JPG y PNG están en `recursos/demo/productos`. La carga los convierte a Base64 y los guarda con cada producto en SQLite; usar la demo no necesita descargar de nuevo las fotos ni consultar los precios por internet. Si se reemplaza una foto desde el formulario, se elimina la atribución de la foto anterior.
