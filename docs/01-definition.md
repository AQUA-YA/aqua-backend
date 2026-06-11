# Definición del Proyecto: AquaYa

**AQUA** es el acrónimo / forma corta de **AquaYa**.

## 1. ¿Qué es AquaYa?

AQUA es un **marketplace de servicios de agua purificada** que conecta **consumidores** que necesitan garrafones de agua con **purificadoras** y **repartidores** que pueden llevárselos a domicilio. Además de la entrega a domicilio, ofrece herramientas de gestión administrativa para dueños de purificadoras, pagos digitales, suscripciones recurrentes y un sistema de fidelización.

El consumidor elige tipo de agua, tamaño de garrafón y cuántos necesita, alguien acepta el pedido y se lo lleva. Pagos en efectivo o con monedero digital, con propina opcional para el repartidor.

---

## 2. Roles del sistema

| Rol | Descripción |
|-----|-------------|
| **Consumidor** | Persona que pide garrafones a domicilio. Es el rol por defecto. |
| **Purificador** | Persona que tiene una o varias purificadoras. Puede tomar pedidos, repartirlos y administrar su negocio (inventario, ventas en local, caja, reportes). |
| **Repartidor** | Persona que reparte agua. Puede ser **independiente** (con su propio inventario) o **vinculado** (asignado a una o varias purificadoras). |
| **Admin** | Administrador del sistema. Ve todo, modera usuarios, configura comisiones, tipos de agua, tamaños de garrafón, descarga reportes, gestiona tickets de soporte. |

**Reglas:**
- Todos se registran como **consumidor**. Desde su perfil pueden activar los roles de Purificador o Repartidor.
- Una persona puede tener **varios roles a la vez**: consumidor + repartidor, purificador + repartidor, etc.
- Un Purificador puede "switchear" a modo consumidor para pedir agua para sí mismo.
- Un consumidor normal **no puede** switchear a Purificador o Repartidor sin antes configurarlo en su perfil.
- Un Repartidor Independiente puede registrar su propio perfil de repartidor sin estar vinculado a ninguna purificadora.

### 2.1 Verificación de identidad (KYC)

Los repartidores deben pasar un proceso de verificación de identidad antes de poder aceptar pedidos:

- Foto de identificación oficial (INE / cédula).
- Selfie de verificación.
- Código QR único que los consumidores pueden escanear al recibir la entrega para confirmar la identidad del repartidor.

El admin puede aprobar o rechazar la verificación. Los consumidores ven un distintivo de **"Verificado"** en el perfil del repartidor. Los pedidos solo pueden ser asignados a repartidores verificados.

---

## 3. Plataforma

| Componente | Tecnología |
|------------|------------|
| App Mobile | **React Native** (iOS + Android) |
| Panel Admin | **Web** (React/Next.js) — solo para el rol Admin |
| Backend | API REST + WebSockets (Node.js con NestJS) |
| Base de datos | **MongoDB** con **Mongoose** ODM |
| Tiempo real | WebSockets (Socket.io) |
| Mapas | Google Maps SDK |
| Pagos | Stripe |
| Notificaciones push | Firebase Cloud Messaging |

---

## 4. Monedero digital + pago en efectivo

El sistema acepta dos métodos de pago: **monedero digital** y **efectivo contra entrega**. El consumidor elige cuál usar **al momento de hacer el pedido**, no antes.

Usar el monedero es opcional. No es necesario tener saldo para pedir agua.

### 4.1 Monedero digital (opcional)

Cada consumidor tiene un **monedero virtual** asociado a su cuenta. Su uso es voluntario.

- El consumidor **deposita dinero** con tarjeta (Stripe) cuando quiera.
- Si paga con monedero, el monto total (producto + propina) se **bloquea** al hacer el pedido.
- Al entregarse, el dinero bloqueado se **transfiere** al monedero del repartidor/purificador, menos la comisión de AQUA.
- El repartidor/purificador puede **retirar su saldo** a su cuenta bancaria.

### 4.2 Efectivo contra entrega

- El consumidor selecciona **"Efectivo"** como método de pago.
- No se bloquea ni descuenta nada del monedero.
- Al llegar, el repartidor cobra el total (producto + propina) en efectivo y marca el pedido como entregado.
- La comisión de AQUA se descuenta del monedero del repartidor/purificador en su siguiente retiro o se registra como deuda interna.

### 4.3 Propina

- Al hacer el pedido, el consumidor puede agregar una **propina voluntaria** para el repartidor (ej. $5, $10, $20 o monto personalizado).
- La propina se suma al total del pedido.
- **Si paga con monedero**: la propina se bloquea y transfiere junto con el pago.
- **Si paga en efectivo**: la propina se cobra en efectivo junto con el total.

### 4.4 Comisión de la plataforma

AQUA cobra una comisión por cada pedido entregado. El admin puede configurar:

- **Comisión fija**: ej. $5 MXN por pedido.
- **Comisión por porcentaje**: ej. 3% del total del pedido.
- También puede **desactivar** la comisión (0%).

La comisión se descuenta automáticamente del pago al repartidor/purificador antes de acreditarle el saldo.

### Tabla de transacciones:
Cada movimiento financiero (depósito, pago con monedero, cobro, comisión, retiro) queda registrado con fecha, monto, tipo y referencia al pedido (si aplica). Los pagos en efectivo **no generan transacciones** de pago, pero sí generan registros de comisión pendiente.

---

## 5. Tipos de agua y tamaños de garrafón

### 5.1 Tipos de agua

El sistema permite múltiples tipos de agua. El admin puede agregar, editar o desactivar tipos. Los más comunes:

| Tipo | Descripción |
|------|-------------|
| **Purificada** | Agua filtrada y purificada, estándar. La más común. |
| **Alcalina** | Agua con pH elevado (8-9). |
| **Mineral** | Agua con minerales naturales o añadidos. |
| **Destilada** | Agua destilada, sin minerales. |

- El purificador selecciona **qué tipos de agua vende** en su purificadora (puede vender uno o varios).
- El consumidor **filtra y elige** el tipo de agua al hacer su pedido.
- El admin ve en el dashboard una métrica de **cuál tipo de agua se vende más**.

### 5.2 Tamaños de garrafón

El sistema soporta múltiples tamaños. El admin puede agregar más. Los más comunes:

| Tamaño | Nombre común |
|--------|--------------|
| 5 L | Garrafón chico |
| 10 L | Garrafón mediano |
| 12 L | Garrafón mediano |
| 20 L | Garrafón estándar (el más común) |

- El purificador selecciona **qué tamaños vende** en su purificadora.
- El consumidor **filtra por tamaño** al buscar y pedir.
- El precio puede variar según el tamaño y tipo de agua.

---

## 6. Flujo de un pedido

### 6.1 El consumidor pide agua

1. Abre la app y ve las purificadoras disponibles cerca de su ubicación.
2. **Filtra** por tipo de agua y/o tamaño de garrafón si lo desea.
3. Elige cuántos garrafones quiere.
4. Decide **cómo quiere pedir**:
   - **Abrir pedido**: cualquier repartidor o purificadora cercana puede tomarlo.
   - **A purificadora específica**: solo esa purificadora (o sus repartidores) pueden tomarlo.
   - **A repartidor específico**: solo ese repartidor (si ya tiene uno de confianza).
5. **Agrega propina** (opcional): $5, $10, $20 o monto personalizado.
6. Elige **método de pago**: monedero o efectivo.
7. Si paga con **monedero**, el total (producto + propina) se bloquea de su saldo. Si paga en **efectivo**, no se descuenta nada.
8. Confirma el pedido.

### 6.2 Alguien acepta el pedido

1. A los repartidores y purificadores **cercanos** al consumidor (según geolocalización) les llega una **notificación push** con los detalles del pedido.
2. El **primero en aceptar** se queda con el pedido (mecanismo "first-accept").
3. Cuando alguien acepta, los demás ya no pueden tomarlo.
4. El consumidor ve en tiempo real: *"Pedido aceptado por {nombre}"*.
5. El consumidor y el repartidor pueden comunicarse mediante un **chat en tiempo real** asociado al pedido.

### 6.3 Entrega

1. **Si el repartidor tiene inventario propio**: va directo a la dirección del consumidor.
2. **Si el repartidor está vinculado a una purificadora**: pasa primero a recoger los garrafones y luego va al consumidor.
3. **Si el purificador acepta**: reparte él mismo o asigna el pedido a uno de sus repartidores registrados.
4. El purificador puede **acumular pedidos** y planificar una ruta antes de salir.
5. El consumidor ve en tiempo real: *"En reparto"* con la ubicación del repartidor en el mapa.
6. **Si aplica**, el repartidor recoge el garrafón vacío del pedido anterior y lo marca en la app.
7. Al llegar, el repartidor marca el pedido como **entregado**.
8. **Si pagó con monedero**: el dinero (producto + propina) se transfiere al monedero del repartidor/purificador, menos la comisión de AQUA.
   **Si pagó en efectivo**: el repartidor cobra en el momento. La comisión queda registrada como deuda.

### Estados del pedido

```
PENDIENTE → ACEPTADO → EN_REPARTO → ENTREGADO
                              ↘ CANCELADO
```

Si el repartidor debe recoger un garrafón vacío, el flujo incluye un estado adicional:

```
PENDIENTE → ACEPTADO → EN_REPARTO → RECOJO_VACIO → ENTREGADO
                                          ↘ CANCELADO
```

### 6.4 Chat comprador-repartidor

Cada pedido activo genera un **chat efímero** entre el consumidor y el repartidor:

- Solo visible mientras el pedido está activo (PENDIENTE → ENTREGADO / CANCELADO).
- Desaparece del historial de chats 24 horas después de finalizar el pedido.
- El consumidor puede enviar mensajes de texto y su ubicación actual.
- El repartidor puede enviar mensajes de texto, fotos y su ubicación actual.
- Notificaciones push para mensajes nuevos.
- El chat es exclusivo del pedido: no hay lista de contactos ni búsqueda de usuarios.

---

## 7. Suscripciones y pedidos recurrentes (opcional)

Las suscripciones son un **módulo opcional**. El consumidor puede usarlas si quiere automatizar sus pedidos, pero no es requisito para usar la app. Las purificadoras pueden optar por participar o ignorar este flujo.

El sistema permite que los consumidores automaticen sus pedidos mediante suscripciones periódicas, lo que fideliza clientes y da ingresos predecibles a las purificadoras.

### 7.1 Configuración de suscripción

- El consumidor elige: tipo de agua, tamaño de garrafón, cantidad, dirección de entrega y método de pago.
- Selecciona la frecuencia: **cada semana**, **cada 15 días** o **cada mes**.
- Define el **día de la semana** y la **hora aproximada** de entrega.
- La suscripción se puede **pausar** o **cancelar** en cualquier momento desde la app.

### 7.2 Generación automática de pedidos

- Un job programado (cron) genera automáticamente el pedido según la configuración de cada suscripción.
- El pedido generado sigue el flujo normal: se notifica a repartidores/purificadores cercanos y alguien lo acepta.
- Si el consumidor seleccionó **monedero** como método de pago, el saldo se bloquea al generarse el pedido.
- Si el pedido no es aceptado en un tiempo límite (ej. 30 minutos), se notifica al consumidor para que tome acción manual.

### 7.3 Dashboard de suscripciones

- El consumidor ve sus suscripciones activas, pausadas e historial de pedidos generados.
- Puede modificar frecuencia, cantidad o dirección sin cancelar la suscripción.
- El purificador ve métricas de cuántos clientes tienen suscripciones activas en su purificadora.

---

## 8. Purificadoras

- Un Purificador puede tener **varias purificadoras** registradas.
- Cada purificadora tiene: nombre, dirección (con coordenadas GPS), horario, teléfono, fotos, descripción, tipos de agua que vende, tamaños de garrafón disponibles.
- Cada purificadora puede tener **repartidores asignados**. Esos repartidores pueden aceptar pedidos en nombre de esa purificadora.
- Los consumidores pueden **calificar** (1-5 estrellas) y dejar comentarios en cada purificadora.

---

## 9. Promociones y cupones

El sistema permite que purificadoras y el admin creen promociones y descuentos para incentivar pedidos.

### 9.1 Tipos de promoción

| Tipo | Descripción | Creado por |
|------|-------------|------------|
| **Descuento por monto** | Ej. "$20 de descuento en tu pedido" | Purificador o Admin |
| **Descuento por porcentaje** | Ej. "10% de descuento en agua alcalina" | Purificador o Admin |
| **2x1** | Lleva 2 garrafones al precio de 1 | Purificador o Admin |
| **Envío gratis** | Sin cargo de envío (si aplica) | Purificador |
| **Bienvenida** | Descuento para el primer pedido del consumidor | Admin |

### 9.2 Reglas de uso

- Cada promoción tiene: código (opcional), tipo, valor, fecha de inicio, fecha de fin, uso máximo total y por usuario.
- Las promociones pueden estar **restringidas a una purificadora específica** o ser **globales** (toda la plataforma).
- El consumidor aplica el cupón al momento de hacer el pedido.
- Un pedido solo puede usar **un cupón a la vez**.
- Las promociones no aplican sobre la propina ni la comisión de AQUA.

---

## 10. Sistema de referidos

Programa de crecimiento viral: los consumidores invitan a otras personas y ambas reciben un beneficio.

### 10.1 Mecánica

- Cada consumidor tiene un **código de referido único** (ej. AQUA-JUAN8K).
- Al compartir su código, la persona invitada lo ingresa durante el registro.
- El nuevo consumidor recibe **$20 de saldo en su monedero** al completar su primer pedido.
- El consumidor que refirió recibe **$20 de saldo en su monedero** cuando el invitado complete su primer pedido.
- El beneficio máximo por referidos es de **$200 por mes** por usuario (para evitar abusos).

### 10.2 Historial de referidos

- El consumidor ve en su perfil: código de referido, cuántas personas ha invitado, cuántas han completado su primer pedido y cuánto ha ganado.
- El admin ve métricas de referidos en el dashboard: tasa de conversión, top referidores, etc.

---

## 11. Programa de lealtad

Sistema de puntos para incentivar la repetición de compras.

### 11.1 Acumulación de puntos

- Por cada **$1 MXN gastado** en pedidos (excluyendo propina), el consumidor acumula **1 punto**.
- Los puntos tienen una **caducidad de 90 días** desde su última acumulación.
- El consumidor ve su saldo de puntos en el perfil y en el dashboard.

### 11.2 Canje de puntos

| Puntos | Beneficio |
|--------|-----------|
| 100 pts | $10 de descuento en tu próximo pedido |
| 250 pts | $30 de descuento |
| 500 pts | Garrafón de 20 L purificada gratis |
| 1000 pts | Garrafón de 20 L alcalina gratis |

- Los puntos se pueden canjear al momento de hacer el pedido.
- No se pueden combinar puntos con cupón en un mismo pedido.
- Los puntos canjeados no generan nuevos puntos.

### 11.3 Eventos especiales

- El admin puede activar **puntos dobles** en fechas especiales (día del agua, temporada de calor, etc.).
- Las purificadoras pueden ofrecer **puntos extra** por comprar ciertos tipos de agua.

---

## 12. Modos en la app

Cada modo es una vista/experiencia diferente dentro de la misma app. Al abrir la app, según el rol activo, carga su dashboard correspondiente.

### Modo Consumidor
- Dashboard con pedidos recientes y purificadoras cercanas.
- Buscar purificadoras por nombre, tipo de agua o tamaño de garrafón.
- Hacer pedidos (con filtros de tipo de agua y tamaño).
- Ver historial de pedidos.
- Gestionar suscripciones activas.
- Ver y gestionar monedero (depositar, ver saldo, ver movimientos).
- Ver puntos de lealtad y canjear beneficios.
- Ver código de referido e historial de referidos.
- Aplicar cupones de descuento.
- Calificar purificadoras.
- Chat con el repartidor (durante pedido activo).
- Completar perfil.

### Modo Purificador

**Dashboard del negocio:**
- Pedidos pendientes por atender (desde la app).
- Pedidos tomados (aceptados, en reparto, entregados).
- Resumen rápido del día: ventas totales, pedidos atendidos, garrafones vendidos, clientes con suscripción activa.

**Administración de purificadoras:**
- CRUD de purificadoras (nombre, ubicación, horario, fotos, tipos de agua, tamaños de garrafón).

**Gestión de pedidos:**
- Aceptar pedidos (le llega notificación).
- Ver ruta hacia el cliente en el mapa.
- Acumular pedidos y planificar ruta.
- Chat con el consumidor (durante pedido activo).
- Gestionar repartidores asignados a su purificadora.
- Gestionar turnos de repartidores (opcional: matutino, vespertino). Si no asigna turno, el repartidor se considera disponible según su propio estado.

**Punto de venta (opcional, para ventas en local):**
- Registrar ventas de garrafones hechas directamente en la purificadora (no por la app).
- Seleccionar tipo de agua, tamaño y cantidad vendida.
- La venta se registra en el historial contable.

**Inventario:**
- Control de garrafones disponibles para la venta.
- Control de sellos de seguridad disponibles.
- Alertas cuando el inventario esté bajo.
- Histórico de movimientos de inventario.

**Caja / Contabilidad:**
- Registrar ingresos y egresos.
- Ver cierre de caja del día.
- Reportes de ventas (diario, semanal, mensual).
- Exportar reportes en CSV.
- Gráficas comparativas de ventas por período.

**Monedero:**
- Ver cobros recibidos, comisiones descontadas, saldo disponible para retiro.

**Promociones:**
- Crear y gestionar promociones y cupones para su purificadora.

### Modo Repartidor
- Dashboard con pedidos cercanos disponibles.
- Aceptar pedidos.
- Ver pedido activo con ubicación del cliente y ruta.
- Marcar pedido como entregado.
- Marcar recogida de garrafón vacío (si aplica).
- Chat con el consumidor (durante pedido activo).
- Historial de entregas.
- Ver su monedero (cobros recibidos, comisiones descontadas).
- Configurar si trabaja con inventario propio o recoge en purificadora.
- Marcar su disponibilidad (disponible / no disponible).
- **Inventario propio**: marcar cuántos garrafones de cada tipo/tamaño lleva disponibles en tiempo real. El sistema solo le notifica pedidos que pueda cumplir según su inventario declarado.
- Escanear código QR del consumidor para confirmar identidad al entregar.

### Modo Admin (Web)
- Dashboard con métricas y gráficas:
  - Usuarios registrados (totales, nuevos hoy/semana/mes).
  - Pedidos por día, semana, mes.
  - Tipo de agua más vendido (gráfica de pastel).
  - Ingresos totales y comisiones generadas.
  - Top 10 purificadoras con más pedidos.
  - Top 10 repartidores con más entregas.
  - **Tasa de conversión de referidos**.
  - **Puntos de lealtad emitidos y canjeados**.
  - **Suscripciones activas**.
  - **Mapa de calor de demanda** por zona geográfica (para identificar oportunidades de expansión).
- CRUD de usuarios (cambiar roles, suspender, ver perfil completo, verificar KYC).
- CRUD de purificadoras.
- CRUD de tipos de agua (agregar, editar, desactivar).
- CRUD de tamaños de garrafón (agregar, editar, desactivar).
- Configuración de comisión (fija / porcentaje / desactivada, con valor configurable).
- Gestión de promociones globales.
- Gestión de tickets de soporte (ver, responder, cerrar tickets de consumidores y repartidores).
- Gestión de verificación KYC de repartidores (aprobar / rechazar documentos).
- Ver todos los pedidos y su estado.
- Descargar reportes en CSV / Excel.
- **Filtros en listas**: todas las listas (usuarios, purificadoras, pedidos, etc.) deben permitir filtrar por email, nombre o el campo relevante.

---

## 13. Sistema de turnos para repartidores (opcional)

Los turnos son una **herramienta organizacional opcional** para purificadores que tienen varios repartidores. Un purificador puede registrar repartidores sin asignarles turno — esos repartidores estarán disponibles según su propio estado. Si el purificador lo desea, puede organizarlos por turnos para tener mejor control de quién está trabajando.

Los purificadores con varios repartidores necesitan organizar quién trabaja y cuándo.

- El purificador asigna **turnos** a sus repartidores vinculados: **matutino** (6am-2pm), **vespertino** (2pm-10pm) o **completo**.
- Cada repartidor puede marcar su **disponibilidad en tiempo real** desde la app (disponible / no disponible / en pausa).
- El sistema solo notifica pedidos a repartidores que tengan turno activo y estén marcados como disponibles.
- El purificador ve qué repartidores están disponibles en cada momento y puede reasignar pedidos manualmente si es necesario.

---

## 14. Mapa de calor de demanda

Herramienta de análisis para el admin y los purificadores.

- El sistema genera un **mapa de calor** basado en la concentración de pedidos por zona geográfica.
- El admin puede consultar: hoy, esta semana, este mes o rango personalizado.
- El purificador ve el mapa de calor limitado a su zona de cobertura.
- Útil para decidir: dónde abrir nuevas purificadoras, qué zonas necesitan más repartidores, horarios de mayor demanda.

---

## 15. Reglas de UI/UX (generales para todos los modos)

| Regla | Descripción |
|-------|-------------|
| Paginación | Todas las listas deben estar paginadas (10-20 items por página). |
| Confirmaciones | Toda acción destructiva o importante debe pedir confirmación ("¿Estás seguro de...?"). |
| Feedback | Cada operación debe mostrar un mensaje claro de éxito o error. |
| Loading | Toda petición al servidor debe mostrar un indicador de carga. |
| Avatar | Todos los perfiles permiten cambiar foto de perfil. |
| Navegación | Bottom tab navigator con las secciones principales del rol activo. |

---

## 16. Flujo de registro y recuperación de contraseña

### 16.1 Registro

1. El consumidor abre la app y presiona **"Crear cuenta"**.
2. Ingresa su **correo electrónico**.
3. El sistema envía un **código alfanumérico de 6 caracteres** al correo.
4. El consumidor ingresa el código en la app.
5. Si el código es correcto, se le pide **definir su contraseña**.
6. La cuenta se activa. El consumidor **inicia sesión automáticamente**.
7. Al entrar por primera vez, se le muestra la pantalla de **completar perfil**:
   - Nombre
   - Apellido
   - Fecha de nacimiento
   - Género (Hombre / Mujer / Otro)
   - **Código de referido** (opcional, si alguien lo invitó)
8. El consumidor puede **saltar este paso** y completarlo después desde su perfil.
9. Mientras no complete su perfil, la app debe recordárselo (con un banner o notificación) pero **no bloquearle el uso** de la app.

### 16.2 Recuperación de contraseña

1. El consumidor presiona **"Olvidé mi contraseña"** en la pantalla de inicio de sesión.
2. Ingresa su **correo electrónico**.
3. El sistema envía un **código alfanumérico de 6 caracteres** al correo.
4. El consumidor ingresa el código.
5. Si es correcto, se le pide **definir una nueva contraseña**.
6. La contraseña se actualiza y el consumidor inicia sesión automáticamente.

---

## 17. Soft delete (eliminación suave)

Ningún registro se elimina físicamente de la base de datos. En su lugar, se marca como eliminado.

**Implementación con Mongoose:**
- Cada schema incluye los campos:
  - `isDeleted`: Boolean, default `false`
  - `deletedAt`: Date, default `null`
- Se crea un **plugin global de Mongoose** que:
  - En `pre('find')`, `findOne`, `findById`, `countDocuments`, etc. filtra automáticamente `{ isDeleted: false }`.
  - En `deleteOne` / `findByIdAndDelete` hace un `update` seteando `isDeleted: true` y `deletedAt: new Date()`.
  - Provee un método `restore()` para revertir el borrado.
- El admin puede ver registros eliminados si lo desea (con un filtro "Mostrar eliminados").

---

## 18. Modelo de datos (entidades principales)

| Entidad | Campos clave |
|---------|--------------|
| **User** | id, nombre, apellido, email, password, fecha_nacimiento, genero (hombre \| mujer \| otro), roles[], avatar, wallet_id, direcciones [{ alias, calle, colonia, ciudad, cp, referencia, lat, lng, es_principal }], isVerified, verificationCode, verificationCodeExpiresAt, codigo_referido, referido_por (user_id), puntos_lealtad, isDeleted, deletedAt, createdAt |
| **Purificadora** | id, owner_id, nombre, dirección, lat, lng, horario, teléfono, fotos[], descripción, tipos_agua_ids[], tamanos_garrafon_ids[], rating_promedio, isDeleted, deletedAt, createdAt |
| **RepartidorPurificadora** | id, repartidor_id, purificadora_id, turno (matutino \| vespertino \| completo), isDeleted, deletedAt |
| **RepartidorInventario** | id, repartidor_id, garrafon_size_id, water_type_id, cantidad_disponible, updatedAt |
| **WaterType** | id, nombre, descripción, isActive, isDeleted, deletedAt |
| **GarrafonSize** | id, litros, nombre, isActive, isDeleted, deletedAt |
| **PurificadoraPrecio** | id, purificadora_id, water_type_id, garrafon_size_id, precio, isDeleted, deletedAt |
| **Order** | id, user_id, atendido_por_id, purificadora_id (opcional), water_type_id, garrafon_size_id, cantidad, total, metodo_pago (efectivo \| monedero), propina, comision_aqua, direccion_entrega { calle, colonia, ciudad, cp, referencia, lat, lng }, garrafon_vacio_devuelto (boolean), estado, subscription_id (nullable), coupon_id (nullable), puntos_canjeados (number), isDeleted, deletedAt, createdAt, updatedAt |
| **OrderStatusHistory** | id, order_id, estado_anterior, estado_nuevo, timestamp |
| **Wallet** | id, user_id, saldo_actual, isDeleted, deletedAt |
| **Transaction** | id, wallet_id, tipo (deposito \| pago \| cobro \| comision \| retiro \| bonificacion_referido \| canje_puntos), monto, order_id (nullable), referencia_pago (Stripe), isDeleted, deletedAt, createdAt |
| **Rating** | id, user_id, purificadora_id, calificación (1-5), comentario, isDeleted, deletedAt, createdAt |
| **CommissionConfig** | id, tipo (fija \| porcentaje \| desactivada), valor (número), updatedBy (admin_id), updatedAt |
| **InventoryItem** | id, purificadora_id, garrafon_size_id, cantidad_disponible, sellos_disponibles, isDeleted, deletedAt |
| **StoreSale** | id, purificadora_id, water_type_id, garrafon_size_id, cantidad, total, metodo_pago (efectivo \| monedero \| transferencia), tipo (app \| local), order_id (nullable, si viene de un pedido de app), createdBy (user_id), isDeleted, deletedAt, createdAt |
| **CashRegister** | id, purificadora_id, fecha, saldo_inicial, ingresos[], egresos[], saldo_final, cerrado (boolean), isDeleted, deletedAt |
| **Subscription** | id, user_id, purificadora_id (opcional), water_type_id, garrafon_size_id, cantidad, frecuencia (semanal \| quincenal \| mensual), dia_semana, hora, direccion_entrega {}, metodo_pago, activa (boolean), ultimo_pedido_generado (date), proximo_pedido (date), isDeleted, deletedAt, createdAt |
| **Coupon** | id, codigo (único), tipo (monto \| porcentaje \| 2x1 \| envio_gratis), valor, purificadora_id (nullable = global), uso_maximo, uso_por_usuario, fecha_inicio, fecha_fin, isActive, isDeleted, deletedAt, createdBy (admin_id \| purificador_id) |
| **Referral** | id, referidor_id (user_id), referido_id (user_id), codigo_usado, beneficio_referidor, beneficio_referido, primer_pedido_completado (boolean), createdAt |
| **SupportTicket** | id, user_id, order_id (nullable), asunto, descripción, archivos[], estado (abierto \| en_proceso \| cerrado), respuesta_admin (texto), resuelto_por (admin_id), isDeleted, deletedAt, createdAt, closedAt |
| **NotificationToken** | id, user_id, token, plataforma (ios \| android), isActive, createdAt |
| **KycVerification** | id, user_id, foto_ine, selfie, status (pendiente \| aprobado \| rechazado), motivo_rechazo (nullable), revisado_por (admin_id), createdAt, updatedAt |
| **ChatMessage** | id, order_id, sender_id, sender_role (consumidor \| repartidor), message_type (texto \| ubicacion \| foto), contenido, createdAt |

---

## 19. Consideraciones técnicas importantes

1. **Geolocalización**: Todas las búsquedas de "cercanos" deben usar coordenadas GPS con índice 2dsphere de MongoDB.
2. **Tiempo real**: Los cambios de estado del pedido y la ubicación del repartidor se transmiten vía WebSockets.
3. **Race condition**: El mecanismo "first-accept" debe manejarse con operación atómica de MongoDB (findOneAndUpdate con condición `{ estado: 'pendiente' }`).
4. **Notificaciones push**: Se envían vía FCM cuando hay un pedido nuevo cerca, mensajes de chat o recordatorios de suscripción.
5. **Seguridad**: Todos los endpoints requieren autenticación (JWT). Los roles se validan en cada endpoint con guards de NestJS.
6. **Escalabilidad**: El sistema debe soportar picos de pedidos en horas de calor. La cola de notificaciones debe ser asíncrona (Bull + Redis).
7. **Offline**: La app mobile debe funcionar offline para lectura de datos cacheados (catálogos, pedidos anteriores, direcciones guardadas).
8. **Soft delete global**: Plugin de Mongoose que aplica a todos los schemas automáticamente.
9. **Envío de correos**: Servicio de emails transaccionales (Sendgrid / Resend) para códigos de verificación, recuperación y notificaciones de suscripción.
10. **Comisión**: Validar que la comisión no supere el total del pedido.
11. **Chat en tiempo real**: Los mensajes del chat se transmiten vía WebSockets (Socket.io) y se persisten en MongoDB. El chat solo está activo mientras el pedido está en estado PENDIENTE, ACEPTADO, EN_REPARTO o RECOJO_VACIO.
12. **Suscripciones**: Job programado (node-cron o Bull) que revisa cada hora las suscripciones cuyo próximo pedido debe generarse y crea el pedido automáticamente.
13. **KYC**: Los documentos de identidad se almacenan de forma segura (S3 / Cloudinary con acceso restringido). El proceso de verificación es asíncrono: el repartidor sube documentos, el admin recibe notificación y puede aprobar/rechazar desde el panel.
14. **Puntos y referidos**: Los beneficios de referidos y puntos se acreditan al monedero del usuario mediante transacciones automáticas con tipo `bonificacion_referido` y `canje_puntos`.
15. **Cupones**: Validar que un cupón no haya excedido su uso máximo ni la fecha de vigencia al momento de aplicarlo al pedido.

---

## 20. Glosario para el desarrollador

| Término | Significado |
|---------|-------------|
| Garrafón | Botellón de agua reutilizable, normalmente de 20 litros. |
| Purificadora | Local que vende agua purificada a granel o en garrafones. |
| Repartidor | Persona que entrega garrafones a domicilio. |
| Monedero | Billetera digital dentro de la app para pagos. |
| First-accept | Mecanismo donde el primero que acepta un pedido se lo lleva. |
| Switcheo | Capacidad de cambiar de rol dentro de la app. |
| Soft delete | Eliminación lógica: el registro se marca como borrado pero no se elimina. |
| Comisión fija | Cobro de un monto fijo por pedido (ej. $5). |
| Comisión porcentual | Cobro de un porcentaje del total del pedido (ej. 3%). |
| Punto de venta (POS) | Módulo para registrar ventas hechas directamente en el local. |
| Sello de seguridad | Sello plástico que garantiza que el garrafón no ha sido abierto. |
| KYC | Verificación de identidad (Know Your Customer). Proceso para validar la identidad de los repartidores. |
| Suscripción | Pedido recurrente automático configurado por el consumidor (semanal, quincenal o mensual). |
| Mapa de calor | Visualización geográfica de la concentración de pedidos en un área. |
| Turno | Bloque horario (matutino / vespertino) asignado a un repartidor vinculado. |
