# CrediLocal

Sistema académico para administrar crédito comercial entre tiendas y sus clientes. Permite registrar ventas a fin de mes o en cuotas, calcular intereses, consultar cronogramas, emitir cortes y registrar la cobranza completa de la deuda exigible.

La versión documentada es la de esta carpeta `sistema`. Usa **React y TypeScript en el navegador, Node.js en el servidor y SQLite como base compartida**. El navegador no guarda la base principal en IndexedDB.

## Primera ejecución desde GitHub

Este repositorio contiene los fuentes. Al clonarlo, instalar Node.js 24.15 o superior y ejecutar en su carpeta:

`powershell
npm ci
npm run build
npm start
`

Después abrir http://127.0.0.1:3000. Las instrucciones siguientes también cubren la distribución compilada en ZIP.

## Ejecutar en cinco minutos

1. Instalar **Node.js 24.15 o superior** y comprobar `node --version`.
2. Abrir una terminal **en esta carpeta**, donde está `package.json`.
3. Ejecutar:

```powershell
npm start
```

4. Abrir **http://127.0.0.1:3000**.

También se puede usar `INICIAR_CrediLocal.cmd`. El paquete preparado incluye `dist` y `servidor-dist`: **para ejecutarlo no hace falta `npm install`**. Mantener la terminal abierta y detener el servidor con Ctrl+C.

En el primer inicio se crea `datos/credilocal.sqlite` con datos ficticios. Los siguientes inicios conservan las operaciones. La dirección con puerto 5180 utilizada durante la revisión de Piero es una configuración local; el puerto predeterminado del código es 3000.

## Accesos de demostración

Contraseña para todos: **`credi2026`**. Seleccionar el perfil indicado.

| Perfil | Correo | Acceso |
|---|---|---|
| Superadministrador | sistema@credilocal.pe | Administrar tiendas |
| Comercio | admin@sutaller.pe | Clientes, catálogo, ventas, cobros y consultas de su tienda |
| Cliente | contacto@transintegrales.pe | Consultar su estado y cronograma |
| Cliente | autopartes@demo.pe | Consultar su estado y cronograma |

Son cuentas ficticias. La pantalla solicita iniciar sesión nuevamente al recargar; los datos permanecen guardados. Cerrar sesión o reiniciar el servidor invalida la sesión; también vence a las ocho horas.

## Qué puede hacer cada integrante al probar

1. Ingresar como Comercio y revisar clientes y catálogo.
2. Registrar un cliente y sus condiciones de crédito; para darle acceso al portal, indicar correo y contraseña inicial.
3. Registrar una venta con productos compatibles y dentro de la línea disponible.
4. Consultar el estado, el cronograma y el listado al corte.
5. Registrar exactamente el pago exigible que muestra la liquidación. El sistema rechaza pagos parciales, excedentes y fechas futuras.
6. Ingresar como Cliente y comprobar que solo consulta su cuenta.
7. Ingresar como Superadministrador y crear una tienda con su cuenta Comercio.

Las bajas conservan los registros históricos. El cliente no administra productos ni registra ventas o pagos. Los permisos se comprueban también en el servidor.

## Cómo está organizado

El código se organiza en cuatro capas: **dominio, aplicación, infraestructura y presentación**. Usa casos de uso y vocabulario de DDD sin añadir una arquitectura distribuida. El recorrido es pantalla → API → caso de uso → dominio → repositorio SQLite.

```text
src/
  dominio/
    modelos.ts                      # Cliente, Venta, Obligacion, Pago, Sesion y Datos
    validaciones.ts                 # Restricciones y utilidades del negocio
    credito/
      motor.ts                      # Fórmulas originales con Decimal
      obligaciones.ts               # Condiciones, deuda y liquidación
  aplicacion/
    puertos.ts                      # Contratos de repositorio y creación de cuentas
    unidadDeTrabajo.ts              # Cola de ejecución y espera de operaciones
    ejecutarOperacion.ts            # Autorización y selección del caso de uso
    registrarOperacion.ts           # Caso de uso, auditoría, cortes y guardado
    datosVisibles.ts                # Datos que puede consultar cada perfil
    administracion/                 # Guardar tienda, cliente y producto
    credito/registrarVenta.ts
    cobranza/registrarPago.ts
    cortes/emitirCorte.ts
  infraestructura/
    http/                           # API JSON y archivos públicos
    persistencia/sqlite.ts           # Implementación del repositorio
    seguridad/                      # PBKDF2, cookies y sesiones
    demostracion/                   # Datos ficticios y carga inicial
    migracion/                      # Compatibilidad con la versión antigua
  presentacion/web/
    App.tsx                         # Rutas y proveedores React
    store.tsx                       # Datos y acciones de las pantallas
    api.ts                          # Adaptador HTTP del navegador
    session.tsx                     # Sesión de la interfaz
    screens/                        # Pantallas
    components/                     # Componentes visuales compartidos
    ayuda.ts, format.ts, styles.css
  main.tsx                          # Entrada del navegador
servidor/main.ts                     # Composición de dependencias y arranque
pruebas/                            # Integración HTTP y límites de arquitectura
```

El dominio no depende de React ni SQLite; la aplicación utiliza contratos y la infraestructura los implementa. Las fórmulas están en `src/dominio/credito/motor.ts`; las ventas, pagos y cortes se coordinan en `src/aplicacion`. Algunas rutas antiguas se conservan como fachadas de compatibilidad con el informe; no contienen la nueva implementación.

## Reglas financieras que hay que comprender

- Las tasas del formulario son anuales, nominales o efectivas; el motor obtiene TED y TEM. Base anual 360 y mes financiero 30 días.
- Los intervalos de fechas para gracia y mora usan días calendario. La hora del corte decide si una compra del mismo día entra en el ciclo.
- `decimal.js` calcula con precisión de 40 dígitos significativos. Los importes de las etapas financieras se redondean a centavos con `ROUND_HALF_UP`; la última cuota ajusta el saldo a cero.
- En cuotas, las compras anteriores al corte capitalizan la gracia hasta el día de pago de ese mes; la primera cuota vence el mes siguiente. Las posteriores al corte no añaden ese tramo de gracia y también empiezan a pagar el mes siguiente. Es la convención implementada, no una regla universal de todos los créditos.
- La mora se calcula sobre capital e interés compensatorio exigibles. El pago se distribuye en mora, compensatorio y capital.
- La línea disponible se controla con capital pendiente proporcional de las ventas; la gracia capitalizada no consume línea adicional.
- Las condiciones quedan copiadas en cada venta para conservar su historia.

Las fórmulas y los casos de uso pueden consultarse directamente en las rutas del código indicadas arriba.

## Desarrollar y verificar

Para modificar el código, instalar primero las dependencias exactas del bloqueo:

```powershell
npm ci
npm test
npm run test:arquitectura
npm run build
npm run test:api
npm start
```

`npm ci` necesita acceso al registro npm. `build` comprueba los tipos del frontend con TypeScript y compila interfaz y servidor; el servidor se empaqueta con esbuild. Las pruebas de API usan bases ficticias separadas. La comprobación anterior registró **45 pruebas unitarias, 6 de API y 4 de arquitectura aprobadas**; hay que repetirlas después de cambiar lógica. `test:arquitectura` comprueba que las dependencias respeten las capas.

Para trabajar con recarga de pantallas, mantener el servidor en el puerto 3000 y ejecutar en otra terminal:

```powershell
npm run dev
```

Usar la URL que indique Vite. Su proxy envía `/api` al servidor 3000. `npm run preview` solo previsualiza la interfaz compilada y no sustituye el servidor completo. Antes de compartir la versión modificada, volver a ejecutar `npm run build`.

## Usar desde varios equipos

Todos deben conectarse a **un mismo servidor y una misma base**. En la terminal del equipo servidor:

```powershell
$env:HOST='0.0.0.0'
$env:PORT='3000'
npm start
```

En los otros equipos de la misma red, abrir `http://IP_DEL_SERVIDOR:3000`. Revisar la IP con `ipconfig` y permitir la conexión en el firewall si corresponde. `127.0.0.1` siempre apunta al propio equipo, y `0.0.0.0` es una dirección de escucha, no la URL para los compañeros.

Los cortes se revisan cada 30 segundos, al iniciar y después de las operaciones. Funcionan sin navegadores abiertos mientras siga activo el servidor. Si se apaga, los cortes pendientes se recuperan al arrancar. La interfaz consulta cambios cada cinco segundos y al recuperar el foco.

El alojamiento público aún requiere configuración: HTTPS, cookie adecuada, almacenamiento persistente para SQLite y un proceso de servidor que permanezca activo. No basta con subir `dist` a un alojamiento estático.

## Respaldar y recuperar

1. Detener el servidor.
2. Copiar `datos/credilocal.sqlite` a un respaldo identificado con fecha.
3. Para restaurar, conservar primero una copia de la base actual y colocar el respaldo en la ruta configurada, con el servidor detenido.
4. Reiniciar y comprobar los registros.

`CREDILOCAL_DB` permite seleccionar otra ruta de base. No ejecutar varias instancias del servicio sobre la misma base. La migración opcional desde la versión antigua utiliza `scripts/exportar-indexeddb.js` y `node scripts/importar-base.mjs respaldo.json datos/importada.sqlite`; el directorio de destino debe existir y el archivo debe ser nuevo. No es necesaria para una instalación nueva.

## Problemas habituales

- **Node no se reconoce:** instalarlo y abrir una nueva terminal.
- **Falta `node:sqlite`:** verificar que Node cumple la versión mínima.
- **Puerto ocupado:** detener la instancia anterior o configurar `$env:PORT='3001'` y usar ese puerto.
- **No conecta desde otro equipo:** comprobar HOST, IP, red, puerto y firewall; mantener el servidor encendido.
- **No aparecen mis cambios de código:** reconstruir y reiniciar; en desarrollo comprobar el proxy hacia 3000.
- **Datos distintos entre compañeros:** comprobar que todos usen la misma URL del servidor, no copias locales distintas.
- **El corte aún no aparece:** comprobar fecha y hora de Lima, obligaciones existentes y que haya llegado el corte.
- **El total difiere del ejemplo:** revisar fecha, tasas y otras compras o pagos de esa base. El caso de cuotas de 4500.00 comparte cliente con compras previas en la demostración.

## Alcance de esta documentación

README de la versión revisada el **20 de octubre de 2026**. Este repositorio contiene el código del sistema y sus instrucciones de ejecución.

