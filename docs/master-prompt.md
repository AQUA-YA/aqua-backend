# Master Prompt — Implementación del backend de AquaYa (AQUA)

> **Este documento es la especificación ejecutable y autocontenida del backend de AquaYa.**
> Está pensado para que una sesión futura de Claude Code (o cualquier desarrollador) lo lea y pueda implementar el sistema completo sin ambigüedades ni preguntas pendientes.

---

## §0 — Propósito y modo de uso

1. **Antes de escribir cualquier módulo**, lee `docs/architecture.md` completo. Sus plantillas de module/controller/service/schema/DTO son **obligatorias y se siguen al pie de la letra**.
2. La implementación se hace **fase por fase** según el roadmap de §13. No se avanza a la siguiente fase hasta que la actual cumpla su criterio de aceptación y `yarn lint && yarn build && yarn test` estén en verde.
3. Cada módulo nuevo se scaffoldea con `nest g resource modules/<name>` (REST API, sin CRUD entry points) y se registra en `app.module.ts`.
4. Swagger se mantiene actualizado en cada fase (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` en cada endpoint).
5. Mensajes de respuesta al usuario **en español**; identificadores de código **en inglés camelCase**; endpoints **kebab-case plural**.
6. Este documento ya resolvió todas las ambigüedades de negocio (§2). Si encuentras un caso no cubierto, aplica la opción más simple consistente con estas decisiones y déjala documentada en el código y en este archivo (sección §16).

## §1 — Jerarquía de fuentes

Ante cualquier conflicto entre documentos, manda el de mayor rango:

1. **`docs/master-prompt.md`** (este documento) — decisiones de producto y diseño resueltas.
2. **`docs/architecture.md`** — convenciones técnicas, plantillas de código, estructura.
3. **`docs/01-definition.md`** — definición de negocio original (contexto y detalle funcional).

## §2 — Registro de decisiones resueltas

Estas decisiones fueron tomadas explícitamente con el dueño del producto y **no se renegocian durante la implementación**:

| # | Tema | Decisión |
|---|------|----------|
| D1 | **Alcance** | Solo backend (API NestJS + WebSockets). La app mobile (React Native) y el panel admin (Next.js) viven en otros repos y consumen esta API. |
| D2 | **Soft delete** | Manda `architecture.md`: `BaseSchema` con **solo `deletedAt`** + helpers `softDeleteCondition()`/`softDeleteQuery()`. **NO** se implementa el campo `isDeleted` ni el plugin global de Mongoose que describe `01-definition.md` §17. El "restore" es un `PATCH` admin que pone `deletedAt = null`. |
| D3 | **Integraciones externas** | Stripe, FCM, S3/Cloudinary y SendGrid/Resend se implementan como **interfaces de proveedor con mocks que simulan éxito** (§9). Nunca llaman servicios externos, nunca bloquean el desarrollo. Las implementaciones reales se conectarán después sustituyendo el provider, sin tocar lógica de negocio. |
| D4 | **Estructura de implementación** | Fases ordenadas y verificables (§13), cada una con criterios de aceptación y tests. |
| D5 | **Precios — "precio al aceptar"** | Cada oferente publica su lista de precios: purificadoras vía `PurifierPrice`, repartidores independientes vía `DeliveryPrice` (entidad nueva, no existía en la definición). En pedidos **abiertos**, el precio real se fija **al aceptar** según la lista del aceptante; el monedero bloquea un **estimado máximo** que se ajusta al aceptar (§8.1). En pedidos a purificadora o repartidor específico, el precio se conoce y fija al crear. |
| D6 | **Costo de envío** | SÍ se modela: campo `deliveryFee` en el pedido. Cada purificadora y cada repartidor independiente configuran el suyo (default `0`). El cupón `free_delivery` lo pone en `0`. |
| D7 | **Versión NestJS** | El repo tiene NestJS 11 instalado; `architecture.md` menciona "NestJS 10" — manda lo instalado (11). |
| D8 | **Colas** | Sin Redis/Bull en v1. Los jobs usan `@nestjs/schedule` (cron in-process). El envío de notificaciones se abstrae tras `PushProvider`; si en el futuro se necesita cola, se cambia el provider. |
| D9 | **Nombres de entidades** | Identificadores en inglés (convención de architecture.md). Tabla de traducción canónica en §6.1. |

## §3 — Stack y dependencias

Package manager: **Yarn**.

```bash
# Runtime
yarn add @nestjs/mongoose mongoose @nestjs/config @nestjs/jwt @nestjs/passport \
  passport passport-jwt @nestjs/swagger class-validator class-transformer \
  @nestjs/throttler @nestjs/websockets @nestjs/platform-socket.io socket.io \
  @nestjs/schedule bcrypt nanoid@3

# Dev
yarn add -D @types/bcrypt @types/passport-jwt mongodb-memory-server
```

Notas:
- `nanoid@3` (compatible CommonJS) para códigos de verificación, códigos de referido y tokens QR.
- Agregar a `package.json`: `"seed": "ts-node -r tsconfig-paths/register src/seed.ts"`.
- No instalar: stripe, firebase-admin, aws-sdk, sendgrid — los mocks no los necesitan (D3).

## §4 — Infraestructura común

Implementar exactamente como especifica `docs/architecture.md` (plantillas literales):

- `src/common/schemas/base.schema.ts` — `BaseSchema` (`deletedAt: Date|null`, `timestamps: true`).
- `src/common/guards/` — `JwtAuthGuard` (global, bypass `@Public()`), `RolesGuard` (global, lee `@Roles()`; sin decorador = cualquier autenticado).
- `src/common/decorators/` — `@Public()`, `@Roles(...roles)`, `@CurrentUser()` (extrae `JwtPayload`: `{ sub, email, roles }`).
- `src/common/interceptors/` — `TransformInterceptor` (envuelve TODO en `{ data, message }` o `{ data, meta, message }`), `SoftDeleteInterceptor` (default `includeDeleted=false`).
- `src/common/filters/http-exception.filter.ts` — unifica errores; Mongo 11000 → 409 `'El recurso ya existe'`.
- `src/common/pipes/parse-object-id.pipe.ts`.
- `src/common/helpers/soft-delete.helper.ts` — `softDeleteCondition()`, `softDeleteQuery()`.
- `src/common/interfaces/` — `PaginationDto` (`search?`, `page?`, `limit?`, `includeDeleted?`), `PaginatedResult<T>`, `PaginationMeta`, `JwtPayload`, enums de §5.
- `src/config/swagger.config.ts` — Swagger en `/docs`, protegido con basic auth (`SWAGGER_USER`/`SWAGGER_PASSWORD`) cuando `NODE_ENV=production`.
- `main.ts` — `ValidationPipe` global (`whitelist: true, transform: true, forbidNonWhitelisted: true`), CORS desde `CORS_ORIGIN`, prefijo global `api` **NO** (sin prefijo, rutas en raíz), puerto `PORT`.
- `app.module.ts` — `ConfigModule.forRoot({ isGlobal: true })`, `MongooseModule.forRootAsync` con `MONGODB_URI`, `ThrottlerModule` (`THROTTLE_TTL`/`THROTTLE_LIMIT`), `ScheduleModule.forRoot()`, providers globales (`APP_GUARD` ×3, `APP_INTERCEPTOR` ×2, `APP_FILTER`).
- `app.controller.ts` — `GET /` health check `@Public()` → `{ status: 'ok' }`.

Reglas CRUD estándar (de architecture.md, aplican a TODOS los servicios):
- `findAll(PaginationDto)` → `PaginatedResult<T>`, `limit` cap 100, sort `createdAt: -1`, filtro `softDeleteCondition`.
- `update` = `findById` + `Object.assign` + `save()`.
- `update`/`remove` verifican existencia → `NotFoundException('Recurso no encontrado')`.
- `remove` = setear `deletedAt = new Date()`.
- `UpdateXDto extends PartialType(CreateXDto)`.

## §5 — Enums y constantes globales

`src/common/interfaces/enums.ts`:

```typescript
export enum Role { CONSUMER = 'consumer', PURIFIER = 'purifier', DELIVERY = 'delivery', ADMIN = 'admin' }
export enum OrderStatus { PENDING = 'pending', ACCEPTED = 'accepted', IN_TRANSIT = 'in_transit', EMPTY_PICKUP = 'empty_pickup', DELIVERED = 'delivered', CANCELLED = 'cancelled' }
export enum OrderMode { OPEN = 'open', TO_PURIFIER = 'to_purifier', TO_DELIVERY = 'to_delivery' }
export enum PaymentMethod { CASH = 'cash', WALLET = 'wallet' }
export enum StoreSalePaymentMethod { CASH = 'cash', WALLET = 'wallet', TRANSFER = 'transfer' }
export enum TransactionType { DEPOSIT = 'deposit', PAYMENT = 'payment', EARNING = 'earning', COMMISSION = 'commission', WITHDRAWAL = 'withdrawal', REFERRAL_BONUS = 'referral_bonus', POINTS_REDEMPTION = 'points_redemption', REFUND = 'refund' }
export enum SubscriptionFrequency { WEEKLY = 'weekly', BIWEEKLY = 'biweekly', MONTHLY = 'monthly' }
export enum CouponType { AMOUNT = 'amount', PERCENTAGE = 'percentage', TWO_FOR_ONE = 'two_for_one', FREE_DELIVERY = 'free_delivery' }
export enum KycStatus { PENDING = 'pending', APPROVED = 'approved', REJECTED = 'rejected' }
export enum TicketStatus { OPEN = 'open', IN_PROGRESS = 'in_progress', CLOSED = 'closed' }
export enum Shift { MORNING = 'morning', EVENING = 'evening', FULL = 'full' }
export enum ChatMessageType { TEXT = 'text', LOCATION = 'location', PHOTO = 'photo' }
export enum Gender { MALE = 'male', FEMALE = 'female', OTHER = 'other' }
export enum CommissionType { FIXED = 'fixed', PERCENTAGE = 'percentage', DISABLED = 'disabled' }
export enum LoyaltyEntryType { EARN = 'earn', REDEEM = 'redeem', EXPIRE = 'expire', BONUS = 'bonus' }
export enum InventoryMovementType { IN = 'in', OUT = 'out', ADJUSTMENT = 'adjustment' }
export enum CashEntryType { INCOME = 'income', EXPENSE = 'expense' }
```

`src/common/constants/business.constants.ts`:

```typescript
export const REFERRAL_BONUS_REFERRER = 20;        // $ MXN al referidor
export const REFERRAL_BONUS_REFERRED = 20;        // $ MXN al invitado
export const REFERRAL_MONTHLY_CAP = 200;          // $ MXN máx/mes por referidor
export const LOYALTY_POINTS_PER_PESO = 1;         // 1 punto por $1 de subtotal
export const LOYALTY_EXPIRATION_DAYS = 90;
export const LOYALTY_REDEMPTIONS = {              // canjes válidos (§8.5)
  100: { type: 'discount', value: 10 },
  250: { type: 'discount', value: 30 },
  500: { type: 'free_bottle', liters: 20, waterTypeName: 'Purificada' },
  1000: { type: 'free_bottle', liters: 20, waterTypeName: 'Alcalina' },
} as const;
export const ORDER_ACCEPT_TIMEOUT_MIN = 30;       // aviso si nadie acepta
export const CHAT_VISIBILITY_HOURS = 24;          // chat visible tras finalizar
export const SUGGESTED_TIPS = [5, 10, 20];
export const VERIFICATION_CODE_LENGTH = 6;        // alfanumérico
export const VERIFICATION_CODE_TTL_MIN = 15;
export const DEFAULT_SEARCH_RADIUS_KM = 5;
```

## §6 — Modelo de datos

### §6.1 Tabla de traducción canónica (D9)

| Definición (español) | Código (inglés) |
|---|---|
| Usuario | `User` |
| Purificadora | `Purifier` |
| Repartidor | rol `delivery` / `DeliveryProfile` |
| RepartidorPurificadora | `PurifierDeliveryLink` |
| RepartidorInventario | `DeliveryInventory` |
| (nueva — D5) lista de precios del repartidor | `DeliveryPrice` |
| Tipo de agua / WaterType | `WaterType` |
| Tamaño de garrafón / GarrafonSize | `BottleSize` |
| PurificadoraPrecio | `PurifierPrice` |
| Pedido / Order | `Order` |
| OrderStatusHistory | `OrderStatusHistory` |
| Monedero / Wallet | `Wallet` |
| Transacción | `Transaction` |
| Calificación / Rating | `Rating` |
| CommissionConfig | `CommissionConfig` |
| InventoryItem | `InventoryItem` (+ `InventoryMovement`, nueva, para el histórico) |
| StoreSale | `StoreSale` |
| CashRegister | `CashRegister` |
| Suscripción | `Subscription` |
| Cupón / Coupon | `Coupon` |
| Referido / Referral | `Referral` |
| Puntos de lealtad | `LoyaltyEntry` (+ `LoyaltyEvent` para puntos dobles/extra) |
| SupportTicket | `SupportTicket` |
| NotificationToken | `NotificationToken` |
| KycVerification | `KycVerification` |
| ChatMessage | `ChatMessage` |

Garrafón → `bottle` en identificadores (`BottleSize`, `emptyBottleReturned`). Propina → `tip`. Sello de seguridad → `seal`.

### §6.2 Tipos compartidos

```typescript
// GeoPoint — usar SIEMPRE este formato para coordenadas (GeoJSON)
{ type: 'Point', coordinates: [lng, lat] }

// Address (subdocumento embebido, sin _id propio salvo en User.addresses)
{ alias, street, neighborhood, city, zipCode, reference, location: GeoPoint, isPrimary }
```

### §6.3 Entidades

Todos los schemas: `SchemaFactory.createForClass(X).add(BaseSchema)` (agrega `createdAt`, `updatedAt`, `deletedAt`). Solo se listan campos propios. `ref:` indica `ObjectId` con referencia.

**User** — colección `users`
| Campo | Tipo / regla |
|---|---|
| `email` | string, required, lowercase, **unique** |
| `passwordHash` | string (bcrypt, salt 10); nunca se devuelve en respuestas (`select: false`) |
| `firstName`, `lastName` | string, opcionales (perfil incompleto permitido) |
| `birthDate` | Date, opcional |
| `gender` | enum `Gender`, opcional |
| `roles` | `Role[]`, default `['consumer']` |
| `avatarUrl` | string, opcional |
| `addresses` | `Address[]` (subdocs con `_id`), máx. lógica: solo una con `isPrimary=true` |
| `isVerified` | boolean, default `false` (true tras verificar email) |
| `verificationCode` | string|null (`select: false`) |
| `verificationCodeExpiresAt` | Date|null |
| `referralCode` | string, **unique**, generado al crear: `AQUA-` + 6 chars nanoid mayúsculas |
| `referredBy` | ref `User`, null. Solo se setea una vez (al completar perfil) |
| `isSuspended` | boolean, default `false` (admin). Usuario suspendido → 403 `'Tu cuenta está suspendida'` en login y en JwtAuthGuard |

**Purifier** — `purifiers` · índice `2dsphere` en `location`
`ownerId` (ref User, required) · `name` · `address` (string) · `location` (GeoPoint, required) · `schedule` (string, ej. `'L-S 8:00-20:00'`) · `phone` · `photos: string[]` · `description` · `waterTypeIds: ref WaterType[]` · `bottleSizeIds: ref BottleSize[]` · `deliveryFee` (number, default 0 — D6) · `avgRating` (default 0) · `ratingsCount` (default 0) · `isActive` (default true)

**PurifierDeliveryLink** — `purifierdeliverylinks` · unique compuesto `(purifierId, deliveryUserId)`
`purifierId` (ref Purifier) · `deliveryUserId` (ref User) · `shift` (enum Shift, **null = sin turno**, disponible según su propio estado)

**DeliveryProfile** — `deliveryprofiles` · `userId` unique
`userId` (ref User) · `hasOwnInventory` (boolean, default false) · `isAvailable` (boolean, default false) · `deliveryFee` (number, default 0 — aplica solo a independientes) · `qrToken` (string unique, nanoid 12) · `kycStatus` (enum KycStatus, default `pending`; **denormalizado**: lo mantiene el módulo KYC al aprobar/rechazar) · `currentLocation` (GeoPoint, null; actualizado por WS) — índice `2dsphere`

**DeliveryInventory** — `deliveryinventories` · unique `(deliveryUserId, waterTypeId, bottleSizeId)`
`deliveryUserId` · `waterTypeId` · `bottleSizeId` · `quantity` (int ≥ 0)

**DeliveryPrice** — `deliveryprices` · unique `(deliveryUserId, waterTypeId, bottleSizeId)` *(nueva — D5)*
`deliveryUserId` · `waterTypeId` · `bottleSizeId` · `price` (number > 0)

**WaterType** — `watertypes`: `name` (unique) · `description` · `isActive` (default true)
**BottleSize** — `bottlesizes`: `liters` (number, unique) · `name` · `isActive` (default true)

**PurifierPrice** — `purifierprices` · unique `(purifierId, waterTypeId, bottleSizeId)`
`purifierId` · `waterTypeId` · `bottleSizeId` · `price` (number > 0)

**Order** — `orders` · índice `2dsphere` en `deliveryAddress.location`; índices en `status`, `consumerId`, `acceptedById`
| Campo | Regla |
|---|---|
| `consumerId` | ref User, required |
| `mode` | enum OrderMode |
| `targetPurifierId` | ref Purifier, requerido si `mode=to_purifier` |
| `targetDeliveryUserId` | ref User, requerido si `mode=to_delivery` |
| `acceptedById` | ref User, null hasta aceptar (repartidor o purificador) |
| `fulfillingPurifierId` | ref Purifier, null — purificadora que surte (si el aceptante es purificador o repartidor vinculado) |
| `assignedDeliveryUserId` | ref User, null — repartidor al que el purificador reasignó la entrega |
| `waterTypeId`, `bottleSizeId` | refs, required |
| `quantity` | int ≥ 1 |
| `unitPrice` | number — fijado al crear (modos específicos) o al aceptar (open) |
| `subtotal` | `unitPrice × quantity` |
| `deliveryFee` | number, default 0 |
| `tip` | number ≥ 0, default 0 |
| `discount` | number ≥ 0 (cupón o puntos), default 0 |
| `couponId` | ref Coupon, null |
| `redeemedPoints` | int, default 0 |
| `total` | `subtotal + deliveryFee + tip − discount` (≥ 0; el descuento nunca toca la propina — se valida `discount ≤ subtotal + deliveryFee`) |
| `estimatedMaxTotal` | number, null — solo pedidos open con wallet (§8.1) |
| `blockedAmount` | number, default 0 — monto actualmente bloqueado en el wallet del consumidor |
| `commissionAmount` | number, default 0 — calculado al entregar |
| `paymentMethod` | enum PaymentMethod |
| `status` | enum OrderStatus, default `pending` |
| `deliveryAddress` | Address embebido (copia snapshot, no ref) |
| `requiresEmptyPickup` | boolean, default false (lo indica el consumidor al crear) |
| `emptyBottleReturned` | boolean, default false |
| `subscriptionId` | ref Subscription, null |
| `cancellationReason` | string, null |
| `notifiedTimeout` | boolean, default false (job §11.2) |

**OrderStatusHistory** — `orderstatushistories`
`orderId` · `fromStatus` (null en creación) · `toStatus` · `changedBy` (ref User). Se crea un registro en **cada** transición, incluida la creación (`null → pending`).

**Wallet** — `wallets` · `userId` unique
`userId` · `balance` (default 0) · `blockedBalance` (default 0) · `debtBalance` (default 0 — comisiones pendientes de pedidos en efectivo, §8.2). Se crea **automáticamente** (lazy) la primera vez que se necesita. Invariante: los tres campos siempre ≥ 0.

**Transaction** — `transactions` · índice `walletId + createdAt`
`walletId` · `type` (enum TransactionType) · `amount` (number > 0; el signo lo da el `type`) · `orderId` (null) · `paymentReference` (string, null — id mock `pi_mock_*` / `po_mock_*`) · `description` (string en español, ej. `'Pago del pedido #...'`)

**Rating** — `ratings` · unique `(userId, orderId)`
`userId` · `purifierId` · `orderId` · `score` (int 1–5) · `comment` (opcional). Al crear, recalcular `avgRating`/`ratingsCount` del Purifier.

**CommissionConfig** — `commissionconfigs`
`type` (enum CommissionType) · `value` (number ≥ 0; si `percentage`, 0–100) · `updatedBy` (ref User). **Histórico**: cada cambio crea un documento nuevo; el vigente es el de `createdAt` más reciente. Si no existe ninguno → comisión desactivada.

**InventoryItem** — `inventoryitems` · unique `(purifierId, bottleSizeId)`
`purifierId` · `bottleSizeId` · `availableQuantity` (int ≥ 0) · `availableSeals` (int ≥ 0) · `lowStockThreshold` (int, default 10)

**InventoryMovement** — `inventorymovements` *(nueva — histórico exigido por definición §12)*
`purifierId` · `bottleSizeId` · `type` (enum InventoryMovementType) · `quantity` (int) · `seals` (int, default 0) · `reason` (string) · `createdBy` (ref User)

**StoreSale** — `storesales`
`purifierId` · `waterTypeId` · `bottleSizeId` · `quantity` · `total` · `paymentMethod` (enum StoreSalePaymentMethod) · `source` (`'app' | 'local'`) · `orderId` (null; seteado si proviene de pedido de app) · `createdBy` (ref User)

**CashRegister** — `cashregisters` · unique `(purifierId, date)` — `date` = string `YYYY-MM-DD`
`purifierId` · `date` · `openingBalance` · `entries[]` subdocs `{ type: CashEntryType, concept, amount, createdAt }` · `closingBalance` (null hasta cerrar) · `isClosed` (default false)

**Subscription** — `subscriptions`
`userId` · `purifierId` (null = abierta) · `waterTypeId` · `bottleSizeId` · `quantity` · `frequency` (enum) · `dayOfWeek` (int 0–6, 0=domingo) · `hour` (string `HH:mm`) · `deliveryAddress` (Address embebido) · `paymentMethod` · `isActive` (default true) · `isPaused` (default false) · `lastGeneratedAt` (Date, null) · `nextOrderAt` (Date — calculado al crear/reanudar/generar)

**Coupon** — `coupons` · `code` unique **sparse**
`code` (string mayúsculas, opcional — sin código = promo de bienvenida auto-aplicable) · `type` (enum CouponType) · `value` (number; sin uso en `two_for_one`/`free_delivery`) · `purifierId` (null = global, solo admin) · `maxUses` (int, null = ilimitado) · `maxUsesPerUser` (int, default 1) · `startsAt` · `endsAt` · `isActive` (default true) · `isWelcome` (boolean, default false — aplica solo al primer pedido del consumidor, solo admin) · `usedCount` (default 0) · `createdBy` (ref User)

**Referral** — `referrals` · unique `(referredId)` — una persona solo puede ser referida una vez
`referrerId` · `referredId` · `codeUsed` · `referrerBonus` · `referredBonus` · `firstOrderCompleted` (default false) · `bonusPaidAt` (Date, null)

**LoyaltyEntry** — `loyaltyentries` · índice `userId + createdAt`
`userId` · `orderId` (null) · `type` (enum LoyaltyEntryType) · `points` (int > 0) · `remainingPoints` (int — solo `earn`/`bonus`: cuántos puntos de esta entrada siguen sin consumir; el FIFO de §8.5 los descuenta) · `expiresAt` (Date — solo `earn`/`bonus`: `createdAt + 90 días`). El **saldo** del usuario = suma de `remainingPoints` de entradas `earn`/`bonus` no expiradas. No hay campo cacheado en User.

**LoyaltyEvent** — `loyaltyevents` *(nueva — puntos dobles/extra, definición §11.3)*
`name` · `multiplier` (number ≥ 1, ej. 2 = puntos dobles) · `waterTypeId` (null = todos) · `purifierId` (null = global, solo admin) · `startsAt` · `endsAt` · `isActive` · `createdBy`. Si varios eventos aplican a un pedido, se usa el multiplicador **mayor** (no se acumulan).

**SupportTicket** — `supporttickets`
`userId` · `orderId` (null) · `subject` · `description` · `attachments: string[]` · `status` (enum TicketStatus, default `open`) · `adminResponse` (null) · `resolvedBy` (ref User, null) · `closedAt` (null)

**NotificationToken** — `notificationtokens` · `token` unique
`userId` · `token` · `platform` (`'ios' | 'android'`) · `isActive` (default true)

**KycVerification** — `kycverifications`
`userId` · `idPhotoUrl` · `selfieUrl` · `status` (enum KycStatus, default `pending`) · `rejectionReason` (null) · `reviewedBy` (ref User, null). Re-envío tras rechazo = documento nuevo (el vigente es el más reciente).

**ChatMessage** — `chatmessages` · índice `orderId + createdAt`
`orderId` · `senderId` · `senderRole` (`'consumer' | 'delivery'`; el purificador que reparte él mismo chatea como `delivery`) · `messageType` (enum ChatMessageType) · `content` (texto, URL de foto, o `'lat,lng'` para ubicación)

## §7 — Especificación por módulo

Convenciones generales que aplican a TODOS los módulos (no se repiten abajo):
- Listas → `PaginationDto` (o un DTO que lo extiende) → `PaginatedResult`.
- `:id` con `ParseObjectIdPipe`.
- Sin `@Roles()` = cualquier autenticado. `@Public()` solo donde se indique.
- "owner o admin" = el servicio valida que `CurrentUser` sea dueño del recurso o tenga rol `admin`; si no → 403 `'No tienes permiso para realizar esta acción'`.
- Mensajes de éxito en español vía TransformInterceptor (`message`).

### 7.1 `auth` (todos `@Public()` salvo `GET /auth/me`)

| Endpoint | Comportamiento |
|---|---|
| `POST /auth/register` `{ email }` | Si el email existe verificado → 409 `'El correo ya está registrado'`. Si existe sin verificar → regenera código. Si no existe → crea User (sin password, `isVerified=false`, `referralCode` generado). Genera código alfanumérico de 6 (mayúsculas+dígitos, nanoid custom alphabet), TTL 15 min, envía vía `MailProvider`. |
| `POST /auth/verify-code` `{ email, code }` | Valida código y vigencia (NO lo consume). 400 `'Código inválido o expirado'`. |
| `POST /auth/set-password` `{ email, code, password }` | Valida código, lo consume (null), hashea password (bcrypt 10), `isVerified=true`. Devuelve `{ accessToken, refreshToken, user }` (login automático). Password: mín. 8 chars. |
| `POST /auth/login` `{ email, password }` | 401 `'Credenciales inválidas'`. 403 si `isSuspended`. Devuelve tokens + user (sin passwordHash). |
| `POST /auth/refresh` `{ refreshToken }` | Verifica con `JWT_REFRESH_SECRET` → nuevos tokens. |
| `POST /auth/forgot-password` `{ email }` | Genera y envía código (idéntico a registro). Si el email no existe responde 200 igual (no filtrar existencia). |
| `POST /auth/reset-password` `{ email, code, newPassword }` | Valida, consume, actualiza hash, devuelve tokens (login automático). |
| `GET /auth/me` | Usuario actual completo (sin campos sensibles). |

JWT payload: `{ sub: userId, email, roles }`. Access: `JWT_ACCESS_EXPIRATION` (default `15m`); refresh: `JWT_REFRESH_EXPIRATION` (default `7d`). Estrategia Passport en `modules/auth/strategies/jwt.strategy.ts`; valida además `isSuspended` y `deletedAt` del usuario en cada request.

### 7.2 `users`

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `PATCH /users/me/profile` | any | `firstName, lastName, birthDate, gender, referralCode?`. Si llega `referralCode`: validar que exista, que no sea el propio, que el usuario no tenga ya `referredBy` y que no tenga pedidos entregados → setea `referredBy` y crea `Referral`. Errores: 400 `'Código de referido inválido'` / `'Ya usaste un código de referido'`. |
| `PATCH /users/me/avatar` | any | `{ file }` (base64 o multipart) → `StorageProvider.upload()` → guarda `avatarUrl`. |
| `POST /users/me/addresses` | any | Agrega Address. Si `isPrimary=true`, desmarca las demás. |
| `PATCH /users/me/addresses/:addressId` · `DELETE ...` | any | Editar / quitar (las direcciones son subdocs: el DELETE sí las remueve del array — no aplica soft delete a subdocumentos). |
| `POST /users/me/roles/purifier` | any | Agrega rol `purifier` si no lo tiene. |
| `POST /users/me/roles/delivery` | any | Agrega rol `delivery` y crea `DeliveryProfile` (kycStatus `pending`). |
| `GET /users` | admin | Lista paginada; `search` matchea `email`, `firstName`, `lastName` (regex i); filtro `role?`. |
| `GET /users/:id` | admin | Perfil completo + wallet + kycStatus si aplica. |
| `PATCH /users/:id` | admin | Cambiar `roles`, `isSuspended`. |
| `PATCH /users/:id/restore` | admin | `deletedAt = null` (D2). |
| `DELETE /users/:id` | admin | Soft delete. |

### 7.3 `water-types` y `bottle-sizes` (catálogos)

CRUD estándar completo. `POST/PATCH/DELETE` → `@Roles('admin')`; `GET` lista y detalle → cualquier autenticado (la lista pública solo devuelve `isActive=true` salvo para admin). "Desactivar" = `PATCH { isActive: false }` (distinto de soft delete). Mensajes: `'Tipo de agua creado'`, etc.

### 7.4 `commission-config`

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `GET /commission-config` | any | Config vigente (la más reciente). Si no hay → `{ type: 'disabled', value: 0 }`. |
| `PUT /commission-config` | admin | Crea registro nuevo `{ type, value, updatedBy }`. Validar: `percentage` → 0–100; `fixed` → ≥ 0. |
| `GET /commission-config/history` | admin | Historial paginado. |

### 7.5 `purifiers`

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `POST /purifiers` | purifier | Crea purificadora (`ownerId = current`). |
| `GET /purifiers/mine` | purifier | Las del owner. |
| `GET /purifiers/nearby` | any | Query: `lat, lng` (required), `radiusKm` (default `DEFAULT_SEARCH_RADIUS_KM`), `waterTypeId?, bottleSizeId?, search?`. `$geoNear` sobre `location`, solo `isActive` y no borradas, con distancia en la respuesta y precios incluidos (`PurifierPrice` populado). |
| `GET /purifiers/:id` | any | Detalle + precios + rating. |
| `PATCH /purifiers/:id` · `DELETE` | owner o admin | Estándar. |
| `GET /purifiers/:id/prices` | any | Lista de precios. |
| `PUT /purifiers/:id/prices` | owner | Bulk upsert: `[{ waterTypeId, bottleSizeId, price }]`. Valida que waterType/bottleSize estén en los arrays de la purificadora y activos. |
| `POST /purifiers/:id/ratings` | consumer | `{ orderId, score, comment? }`. Valida: pedido `delivered`, del usuario, surtido por esa purificadora (`fulfillingPurifierId`), sin rating previo (unique). Recalcula promedio. |
| `GET /purifiers/:id/ratings` | any | Paginado. |
| `POST /purifiers/:id/delivery-links` | owner | `{ deliveryUserId, shift? }`. El usuario debe tener rol `delivery`. 409 si ya existe el vínculo. |
| `GET /purifiers/:id/delivery-links` | owner o admin | Con datos del repartidor (disponibilidad, kycStatus). |
| `PATCH /purifiers/:id/delivery-links/:linkId` | owner | Cambiar `shift` (null = quitar turno). |
| `DELETE /purifiers/:id/delivery-links/:linkId` | owner | Soft delete del vínculo. |
| `GET /purifiers/:id/dashboard` | owner | Resumen del día: pedidos pendientes/aceptados/entregados, ventas totales del día (orders + store sales), garrafones vendidos, suscripciones activas que apuntan a esta purificadora. |
| `GET /purifiers/:id/heatmap` | owner | Igual que 7.20 pero limitado a un radio de 10 km alrededor de la purificadora. |

**Turno activo** (para elegibilidad de pedidos): `morning` = 06:00–14:00, `evening` = 14:00–22:00, `full` = siempre, `null` = siempre (decide su propia disponibilidad). Hora local del servidor.

### 7.6 `delivery`

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `GET /delivery/me/profile` | delivery | Perfil + kycStatus + vínculos. |
| `PATCH /delivery/me/profile` | delivery | `hasOwnInventory`, `deliveryFee`. |
| `PATCH /delivery/me/availability` | delivery | `{ isAvailable }`. |
| `GET /delivery/me/inventory` · `PUT` | delivery | Bulk upsert `[{ waterTypeId, bottleSizeId, quantity }]`. |
| `GET /delivery/me/prices` · `PUT` | delivery | Bulk upsert de `DeliveryPrice` (solo relevante para independientes — D5). |
| `POST /delivery/me/kyc` | delivery | `{ idPhoto, selfie }` → `StorageProvider` → crea `KycVerification` (`pending`) y actualiza `DeliveryProfile.kycStatus='pending'`. Notifica a admins (mock push). |
| `GET /delivery/me/kyc` | delivery | Estado de la verificación vigente. |
| `GET /delivery/me/qr` | delivery | `{ qrToken }` (solo si KYC aprobado; si no → 403 `'Debes completar tu verificación de identidad'`). |
| `POST /delivery/verify-qr` | any | `{ qrToken }` → datos públicos del repartidor (nombre, avatar, badge verificado). 404 si no existe o KYC no aprobado. |
| `GET /delivery/me/deliveries` | delivery | Historial de pedidos entregados por él (paginado). |
| `GET /kyc-verifications` | admin | Paginado, filtro `status?`. |
| `PATCH /kyc-verifications/:id` | admin | `{ status: approved\|rejected, rejectionReason? }`. Actualiza también `DeliveryProfile.kycStatus`. Notifica al repartidor (mock push). |

### 7.7 `wallets`

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `GET /wallets/me` | any | `{ balance, blockedBalance, debtBalance }` (crea wallet lazy). |
| `POST /wallets/me/deposits` | any | `{ amount > 0 }` → `PaymentProvider.createDeposit()` (mock OK) → `balance += amount` + Transaction `deposit`. |
| `POST /wallets/me/withdrawals` | purifier, delivery | `{ amount > 0 }`. Disponible = `balance`. Reglas: primero se descuenta `debtBalance` (la deuda se liquida con Transaction `commission` y `description: 'Comisión pendiente de pedidos en efectivo'`); el resto se retira vía `PaymentProvider.createPayout()` + Transaction `withdrawal`. Si `amount > balance` → 400 `'Saldo insuficiente'`. |
| `GET /wallets/me/transactions` | any | Paginado, filtro `type?`. |

Todas las mutaciones de saldo del sistema pasan por métodos del `WalletsService` (`deposit`, `block`, `unblock`, `settleOrder`, `addDebt`, …) — ningún otro módulo toca los campos directamente. Cada mutación crea su `Transaction` correspondiente en la misma operación.

### 7.8 `orders`

**`POST /orders`** (consumer) — body:
```
mode, targetPurifierId?, targetDeliveryUserId?, waterTypeId, bottleSizeId, quantity,
addressId? | deliveryAddress?, tip?, paymentMethod, couponCode?, redeemPoints?, requiresEmptyPickup?
```
Flujo de creación:
1. Resolver dirección (de `addresses` del user por `addressId`, o inline) → snapshot en el pedido.
2. Resolver precio según `mode`:
   - `to_purifier`: `PurifierPrice` de esa purificadora (404 `'La purificadora no ofrece ese producto'` si no existe) + su `deliveryFee`. La purificadora debe estar activa y vender ese tipo/tamaño.
   - `to_delivery`: `DeliveryPrice` del repartidor (debe ser independiente con KYC aprobado) + su `deliveryFee`. 400 `'El repartidor no ofrece ese producto'`.
   - `open`: `unitPrice` y `deliveryFee` quedan `null`; se calcula `estimatedMaxTotal` (§8.1).
3. Cupón / puntos (§8.4 / §8.5). No combinables: si llegan ambos → 400 `'No puedes combinar cupón y puntos en el mismo pedido'`.
4. Si `paymentMethod=wallet`: bloquear (`block`) el total (modos específicos) o `estimatedMaxTotal` (open). Saldo insuficiente → 400 `'Saldo insuficiente en tu monedero. Puedes pagar en efectivo.'`.
5. Crear Order (`pending`) + OrderStatusHistory + notificar a elegibles cercanos (push mock + WS `order.created.nearby`).

**Elegibles para un pedido** (se usa al notificar y al validar `accept`):
- KYC aprobado (si es repartidor), disponible (`isAvailable`), turno activo si tiene turno.
- `open`: purificadoras activas en el radio que vendan el producto, sus repartidores vinculados, y repartidores independientes con inventario declarado suficiente (`DeliveryInventory.quantity ≥ quantity`) y precio publicado para ese producto.
- `to_purifier`: el owner y los repartidores vinculados de esa purificadora.
- `to_delivery`: solo ese repartidor.

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `GET /orders/available` | purifier, delivery | Pedidos `pending` cercanos (query `lat,lng,radiusKm?`) para los que el usuario es elegible. |
| `POST /orders/:id/accept` | purifier, delivery | **First-accept atómico** (§12). Valida elegibilidad ANTES del update. Fija `unitPrice/deliveryFee/subtotal/total` reales (en open: lista del aceptante; vinculado sin lista propia → lista de la purificadora vinculada y `fulfillingPurifierId` = esa purificadora). Wallet: ajusta bloqueo (§8.1). Re-valida `discount ≤ subtotal + deliveryFee` con el total real; si el descuento excede, se recorta (`discount = subtotal + deliveryFee`). Notifica al consumidor (push + WS `order.accepted`). |
| `POST /orders/:id/assign` | purifier (aceptante) | `{ deliveryUserId }` — debe ser repartidor vinculado a `fulfillingPurifierId`, disponible y verificado → setea `assignedDeliveryUserId`. El asignado puede ejecutar las transiciones siguientes. |
| `PATCH /orders/:id/status` | aceptante/asignado | `{ status }`. Transiciones válidas: `accepted→in_transit`, `in_transit→empty_pickup` (solo si `requiresEmptyPickup`), cualquier otra → 400 `'Transición de estado inválida'`. Cada cambio crea historia + WS `order.status_changed` + push. |
| `POST /orders/:id/deliver` | aceptante/asignado | `{ emptyBottleReturned? }`. Estado previo debe ser `in_transit` o `empty_pickup`. Ejecuta settlement (§8.3), descuenta inventario (§8.6), acredita puntos y referidos (§8.5, §8.7), marca `delivered`. |
| `POST /orders/:id/cancel` | consumer dueño, aceptante o admin | `{ reason }`. Consumer: solo en `pending`. Aceptante: en `accepted`/`in_transit`/`empty_pickup` (el pedido **vuelve a `pending`**, se limpia aceptante y se re-notifica — no se cancela del todo; si quien cancela es admin o consumer sí pasa a `cancelled`). Wallet: al cancelar se libera todo el bloqueo; al volver a pending se mantiene. Devuelve uso de cupón (`usedCount--`) y puntos (revierte el `redeem`) si pasa a `cancelled`. |
| `GET /orders/mine` | consumer | Paginado, filtro `status?`. |
| `GET /orders/assigned` | purifier, delivery | Pedidos donde es aceptante o asignado, filtro `status?`. |
| `GET /orders` | admin | Todos, filtros `status?, search?` (search por email/nombre del consumidor), `format=csv`. |
| `GET /orders/:id` | involucrados o admin | Detalle + historial de estados populado. |

### 7.9 `chat`

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `GET /orders/:id/messages` | participantes (consumer, aceptante, asignado) o admin | Mensajes ordenados por fecha. **Visibilidad**: pedido activo, o finalizado (`delivered`/`cancelled`) hace < 24 h (comparar `updatedAt` del pedido); si no → 404 `'El chat ya no está disponible'`. |
| `POST /orders/:id/messages` | participantes | `{ messageType, content }` (REST fallback del WS). Solo con pedido en estado activo (`pending` a `empty_pickup`) → si no, 400 `'El chat está cerrado'`. Tipos permitidos: consumer → `text`,`location`; repartidor/purificador → `text`,`location`,`photo`. Persiste + WS `chat.message` + push al receptor. |

### 7.10 `notifications`

`POST /notifications/tokens` `{ token, platform }` (upsert por token) · `DELETE /notifications/tokens/:token`. Servicio interno `NotificationsService.sendToUser(userId, title, body, data)` → busca tokens activos → `PushProvider.send()` (mock). Lo consumen orders, chat, kyc, subscriptions.

### 7.11 `subscriptions`

CRUD del consumidor: `POST /subscriptions`, `GET /subscriptions/mine`, `GET /subscriptions/:id`, `PATCH /subscriptions/:id` (frecuencia, cantidad, dirección, hora… sin cancelar), `POST /subscriptions/:id/pause`, `POST /subscriptions/:id/resume`, `DELETE /subscriptions/:id` (cancela, soft).
- `nextOrderAt` se calcula con `frequency + dayOfWeek + hour`: el próximo instante futuro que caiga en ese día/hora (quincenal = +14 días desde la última generación; mensual = mismo día de semana, +28 días).
- `GET /subscriptions/:id/orders` — pedidos generados por la suscripción.
- Purificador: `GET /purifiers/:id/subscriptions/metrics` (owner) → `{ activeCount, pausedCount }` de suscripciones con `purifierId` = esa.
- Cron de generación: §11.1.

### 7.12 `coupons`

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `POST /coupons` | admin, purifier | Purifier: `purifierId` obligatorio y suyo; no puede crear `isWelcome`. Admin: global o de cualquier purificadora. `code` se guarda en mayúsculas. |
| `GET /coupons` | admin | Todos, paginado. |
| `GET /coupons/mine` | purifier | Los de sus purificadoras. |
| `PATCH /coupons/:id` · `DELETE` | creador o admin | Estándar. |
| `POST /coupons/validate` | any | `{ code, purifierId?, subtotal, deliveryFee }` → preview `{ valid, discount, newDeliveryFee }` sin consumir uso. |

Validación al aplicar (en `POST /orders`): activo, vigente (`startsAt ≤ now ≤ endsAt`), `usedCount < maxUses`, usos del usuario (count de orders no canceladas con ese `couponId` y ese consumer) `< maxUsesPerUser`, restricción de purificadora (si `purifierId` ≠ null, solo aplica a pedidos `to_purifier` de esa purificadora), `isWelcome` → el consumidor no tiene pedidos `delivered`. Error genérico: 400 `'El cupón no es válido o ya expiró'`. El `usedCount` se incrementa al crear el pedido y se revierte si se cancela.

### 7.13 `referrals`

`GET /referrals/me` → `{ referralCode, invitedCount, completedCount, totalEarned, monthEarned }`. La aplicación del código ocurre en `PATCH /users/me/profile` (7.2); el pago del bono ocurre en el settlement del primer pedido entregado del referido (§8.7).

### 7.14 `loyalty`

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `GET /loyalty/me` | any | `{ balance, expiringSoon: [{ points, expiresAt }], entries (paginado) }`. |
| `POST /loyalty/events` | admin, purifier | Purifier solo con `purifierId` propio y `multiplier ≤ 3`; admin libre. |
| `GET /loyalty/events` | admin, purifier | Activos y futuros. |
| `PATCH /loyalty/events/:id` · `DELETE` | creador o admin | Estándar. |

Canje: solo dentro de `POST /orders` vía `redeemPoints` (§8.5). No hay endpoint de canje directo.

### 7.15 `inventory` (de purificadora)

`GET /purifiers/:id/inventory` (owner o admin) — items con flag `lowStock: availableQuantity < lowStockThreshold`.
`PUT /purifiers/:id/inventory` (owner) — bulk upsert `[{ bottleSizeId, availableQuantity, availableSeals, lowStockThreshold? }]`; cada cambio manual genera `InventoryMovement` tipo `adjustment`.
`POST /purifiers/:id/inventory/movements` (owner) — `{ bottleSizeId, type: in|out, quantity, seals?, reason }`; aplica el delta al item (no permitir quedar < 0 → 400 `'Inventario insuficiente'`).
`GET /purifiers/:id/inventory/movements` (owner o admin) — histórico paginado.
Las ventas (pedidos entregados surtidos por la purificadora y ventas POS) generan movimientos `out` automáticos (§8.6).

### 7.16 `store-sales` (POS)

`POST /purifiers/:id/store-sales` (owner) — `{ waterTypeId, bottleSizeId, quantity, total, paymentMethod }`, `source='local'`. Descuenta inventario (movimiento `out`, razón `'Venta en local'`) y agrega ingreso automático a la caja abierta del día si existe.
`GET /purifiers/:id/store-sales` (owner o admin) — paginado, filtros `from?/to?` (fecha).

### 7.17 `cash-registers`

`POST /purifiers/:id/cash-registers` (owner) — `{ date?, openingBalance }` (default hoy). 409 si ya existe la del día.
`POST /purifiers/:id/cash-registers/:registerId/entries` (owner) — `{ type, concept, amount }`.
`POST /purifiers/:id/cash-registers/:registerId/close` (owner) — `closingBalance = openingBalance + Σingresos − Σegresos`, `isClosed=true`. No se aceptan más entradas → 400 `'La caja ya está cerrada'`.
`GET /purifiers/:id/cash-registers` (owner o admin) — historial paginado.

### 7.18 `reports`

`GET /purifiers/:id/reports/sales?period=daily|weekly|monthly&from&to&format=json|csv` (owner o admin) — agrega `Order` entregadas surtidas por la purificadora + `StoreSale`, agrupado por período: `{ period, ordersCount, bottlesSold, revenue }[]` + totales. `format=csv` → `Content-Type: text/csv` + `Content-Disposition` (este endpoint NO pasa por TransformInterceptor: usar `@Res()` o un decorador `@SkipTransform()` implementado con metadata y soportado por el interceptor).
El patrón `format=csv` se reutiliza en las listas admin (`GET /orders`, `GET /users`).

### 7.19 `support-tickets`

`POST /support-tickets` (any) — `{ orderId?, subject, description, attachments? }`.
`GET /support-tickets/mine` (any) · `GET /support-tickets` (admin, filtro `status?`, `search` por asunto/email) · `GET /support-tickets/:id` (dueño o admin).
`PATCH /support-tickets/:id` (admin) — `{ status?, adminResponse? }`; al pasar a `closed` setea `closedAt` y `resolvedBy`. Notifica al usuario (mock push).

### 7.20 `dashboard` (admin)

`GET /dashboard/metrics?from&to` (admin) — un solo endpoint con agregaciones:
`{ users: { total, newToday, newWeek, newMonth }, orders: { today, week, month, byDay[] }, revenue: { total, commissions }, topWaterTypes[] (para gráfica de pastel), topPurifiers[] (top 10 por pedidos), topDeliveryUsers[] (top 10 por entregas), referrals: { invited, converted, conversionRate }, loyalty: { pointsIssued, pointsRedeemed }, subscriptions: { active } }`.
`GET /dashboard/heatmap?from&to` (admin) — agregación sobre `Order.deliveryAddress.location`: redondear coordenadas a una grilla (`$round` a 3 decimales ≈ 110 m) y agrupar → `[{ lat, lng, count }]`.

## §8 — Lógica financiera y de negocio (especificación cerrada)

### 8.1 Pago con monedero — ciclo de bloqueo

- **Crear** (modos específicos): `block(consumerWallet, total)` → `balance -= total`, `blockedBalance += total`, `Order.blockedAmount = total`. Sin Transaction (el bloqueo no es un movimiento; la Transaction `payment` nace al entregar).
- **Crear** (open): `estimatedMaxTotal = max(unitPrice de oferentes elegibles en el radio) × quantity + max(deliveryFee de esos oferentes) + tip − discount`. Si no hay ningún oferente elegible con precio → 400 `'No hay oferta disponible en tu zona para ese producto'`. Se bloquea `estimatedMaxTotal`.
- **Aceptar** (open): total real según lista del aceptante → `unblock` de la diferencia (`blockedBalance -= diff`, `balance += diff`), `blockedAmount = total`. Si el precio del aceptante superara lo bloqueado (no debería: el bloqueo fue el máximo; puede pasar si el aceptante subió su precio entre crear y aceptar) → intentar bloquear la diferencia; si no alcanza el saldo → 409 `'No puedes aceptar este pedido: excede el saldo bloqueado del cliente'`.
- **Entregar**: §8.3.
- **Cancelar** (a `cancelled`): `unblock` total de `blockedAmount`, `blockedAmount = 0`. Transaction `refund` (amount = lo liberado, description `'Reembolso por cancelación'`) solo informativa para el historial del consumidor.

### 8.2 Pago en efectivo

Sin bloqueo, sin transacciones de pago. Al entregar: la comisión se suma a `debtBalance` del wallet del **earner** (quien cobra: ver 8.3) + Transaction `commission` con description `'Comisión pendiente (pedido en efectivo)'`. La deuda se liquida en el siguiente retiro (7.7).

### 8.3 Settlement al entregar (`POST /orders/:id/deliver`)

1. **Earner** = `acceptedById` si es repartidor independiente; si el pedido lo surte una purificadora (`fulfillingPurifierId != null`), el earner es el **owner de la purificadora** (los acuerdos internos purificador↔repartidor vinculado quedan fuera del sistema en v1).
2. `commissionAmount` = según CommissionConfig vigente: `fixed` → `value`; `percentage` → `total × value / 100`; `disabled` → 0. **Validar `commissionAmount ≤ total`** (si excede, recortar a `total`).
3. **Wallet**: consumidor → `blockedBalance -= blockedAmount` + Transaction `payment` (amount = total). Earner → `balance += (total − commissionAmount)` + Transaction `earning` (total) y Transaction `commission` (commissionAmount, si > 0).
4. **Efectivo**: solo `debtBalance += commissionAmount` al earner (8.2).
5. Inventario (8.6), puntos (8.5), referidos (8.7), notificaciones (push + WS).
6. Todo el settlement es **idempotente por estado**: solo se ejecuta en la transición a `delivered` (validar estado previo).

### 8.4 Cupones — cálculo del descuento

Base de descuento = `subtotal` (nunca propina, nunca comisión):
- `amount`: `discount = min(value, subtotal + deliveryFee)`.
- `percentage`: `discount = subtotal × value / 100`.
- `two_for_one`: `discount = unitPrice × floor(quantity / 2)`.
- `free_delivery`: `discount = 0`, pero `deliveryFee = 0` en el pedido.
En pedidos `open`, el descuento de tipo `percentage`/`two_for_one` se calcula provisionalmente con el precio máximo estimado y se **recalcula al aceptar** con el precio real.

### 8.5 Puntos de lealtad

- **Acumular** (al entregar): `points = floor(subtotal × LOYALTY_POINTS_PER_PESO × multiplier)` donde `multiplier` = mayor `LoyaltyEvent` activo aplicable (global, o de la `fulfillingPurifierId`, o del `waterTypeId`); pedidos pagados con puntos no generan puntos sobre el monto descontado (base = `subtotal − discount` cuando `redeemedPoints > 0`). Crea `LoyaltyEntry` `earn` con `remainingPoints = points`, `expiresAt = now + 90d`.
- **Canjear** (al crear pedido): `redeemPoints` debe ser exactamente una clave de `LOYALTY_REDEMPTIONS`:
  - `100` / `250` → descuento de $10 / $30 (`discount`, tope `subtotal + deliveryFee`).
  - `500` / `1000` → garrafón gratis: el pedido debe ser exactamente del producto indicado (20 L purificada / 20 L alcalina, matcheando por `liters` y `name` del catálogo) → `discount += unitPrice × 1` (en open, se aplica al aceptar). Si el producto no coincide → 400 `'Ese canje no aplica a este pedido'`.
  - Saldo insuficiente → 400 `'No tienes puntos suficientes'`.
  - Consumo **FIFO**: descontar `remainingPoints` de las entradas `earn`/`bonus` no expiradas más antiguas; crear `LoyaltyEntry` `redeem` + Transaction `points_redemption` (amount = valor en $ del descuento) en el wallet del consumidor (informativa).
  - Si el pedido se cancela: revertir (restaurar `remainingPoints` consumidos, marcar la entrada `redeem` con soft delete).

### 8.6 Inventario al entregar / vender

- Pedido surtido por purificadora: `InventoryItem` de esa purificadora → `availableQuantity -= quantity` y `availableSeals -= quantity` (sin ir debajo de 0; si no hay registro, omitir silenciosamente) + `InventoryMovement` `out` razón `'Pedido entregado #<id>'`. Crear también `StoreSale` con `source='app'` y `orderId` (alimenta reportes).
- Pedido entregado por independiente: `DeliveryInventory -= quantity` (mínimo 0).
- Venta POS: 7.16.

### 8.7 Referidos al entregar

Si es el **primer pedido `delivered`** del consumidor y existe `Referral` con `referredId = consumer` y `firstOrderCompleted = false`:
1. Marcar `firstOrderCompleted = true`, `bonusPaidAt = now`.
2. Acreditar $20 al wallet del referido (Transaction `referral_bonus`, `'Bono de bienvenida por referido'`).
3. Calcular lo ganado por el referidor en el mes calendario actual (suma de `referral_bonus` de su wallet del mes): si `+20` no supera $200 → acreditar $20 al referidor (Transaction `referral_bonus`, `'Bono por invitar a un amigo'`); si lo supera, no se acredita (y no se difiere).

## §9 — Proveedores mock (`src/providers/`)

Módulo global `ProvidersModule` (`@Global()`) que exporta los 4 tokens. Cada provider tiene interfaz + implementación mock; todos los mocks **loguean con `Logger` y devuelven éxito**. Inyección por token para sustituir por implementaciones reales sin tocar consumidores:

```typescript
export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
export interface PaymentProvider {
  createDeposit(userId: string, amount: number): Promise<{ success: true; reference: string }>;  // 'pi_mock_<nanoid>'
  createPayout(userId: string, amount: number): Promise<{ success: true; reference: string }>;   // 'po_mock_<nanoid>'
}

export const MAIL_PROVIDER = 'MAIL_PROVIDER';
export interface MailProvider {
  sendVerificationCode(email: string, code: string): Promise<void>;  // mock: Logger.log(`[MAIL] Código para ${email}: ${code}`)
}

export const PUSH_PROVIDER = 'PUSH_PROVIDER';
export interface PushProvider {
  send(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void>;  // mock: log
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
export interface StorageProvider {
  upload(file: Buffer | string, folder: string): Promise<{ url: string }>;  // mock: 'https://storage.aquaya.mock/<folder>/<nanoid>.jpg' (no escribe disco)
}
```

Regla: **ningún módulo de negocio importa SDKs externos ni conoce los mocks** — solo las interfaces por token.

## §10 — Tiempo real (Socket.io)

Módulo `realtime` con un `EventsGateway` (`@WebSocketGateway({ cors })`):
- **Handshake**: token JWT en `auth.token` → validar con `JWT_ACCESS_SECRET`; inválido → desconectar. Unir socket a room `user:{userId}`.
- **Rooms**: `user:{id}` (notificaciones personales) y `order:{id}` (se une vía evento `order.join`, validando que el usuario sea participante del pedido).

| Evento (server → client) | Room | Payload |
|---|---|---|
| `order.created.nearby` | `user:{id}` de cada elegible | `{ orderId, mode, waterType, bottleSize, quantity, distanceKm, tip }` |
| `order.accepted` | `order:{id}` + `user:{consumerId}` | `{ orderId, acceptedBy: { id, name, avatarUrl, verified } }` |
| `order.status_changed` | `order:{id}` | `{ orderId, status }` |
| `order.location` | `order:{id}` | `{ orderId, lat, lng }` |
| `chat.message` | `order:{id}` | ChatMessage serializado |

| Evento (client → server) | Quién | Acción |
|---|---|---|
| `order.join` / `order.leave` | participantes | Unirse/salir del room (validar pertenencia). |
| `order.location.update` `{ orderId, lat, lng }` | repartidor del pedido activo | Actualiza `DeliveryProfile.currentLocation` y reemite `order.location`. |
| `chat.send` `{ orderId, messageType, content }` | participantes | Misma validación/persistencia que 7.9 y reemite `chat.message`. |

Los servicios de negocio NO importan el gateway directamente: el gateway escucha eventos internos emitidos con `EventEmitter2`… **Simplificación v1**: el `RealtimeModule` exporta un `RealtimeService` con métodos (`emitToUser`, `emitToOrder`) y los módulos de negocio lo inyectan (usar `forwardRef` si hay ciclos).

## §11 — Jobs programados (`@nestjs/schedule`, en `modules/jobs/`)

1. **Suscripciones — cada hora** (`@Cron(CronExpression.EVERY_HOUR)`): buscar `Subscription` activas, no pausadas, `nextOrderAt <= now` → por cada una crear pedido (mismo flujo que `POST /orders`, `subscriptionId` seteado, modo `to_purifier` si tiene `purifierId`, si no `open`); si `paymentMethod=wallet` y no alcanza el saldo → no crear y notificar `'No pudimos generar tu pedido de suscripción: saldo insuficiente'`. Actualizar `lastGeneratedAt` y recalcular `nextOrderAt`.
2. **Timeout de aceptación — cada 5 min**: pedidos `pending` con `createdAt < now − 30 min` y `notifiedTimeout=false` → push al consumidor `'Tu pedido aún no ha sido aceptado'` + marcar `notifiedTimeout=true`.
3. **Expiración de puntos — diario 03:00**: `LoyaltyEntry` `earn`/`bonus` con `expiresAt < now` y `remainingPoints > 0` → crear entrada `expire` por el remanente y poner `remainingPoints = 0`.

## §12 — First-accept y concurrencia

```typescript
const order = await this.orderModel.findOneAndUpdate(
  { _id: id, status: OrderStatus.PENDING, deletedAt: null },
  { $set: { status: OrderStatus.ACCEPTED, acceptedById, fulfillingPurifierId, unitPrice, subtotal, deliveryFee, discount, total } },
  { new: true },
);
if (!order) throw new ConflictException('El pedido ya fue tomado');
```

- La **elegibilidad** (KYC aprobado, disponible, turno activo, inventario, vínculo según `mode`) se valida ANTES del update; la **atomicidad** del estado la garantiza el `findOneAndUpdate`.
- El ajuste de bloqueo del wallet (§8.1) ocurre después del update; si fallara, revertir el pedido a `pending` (compensación) y relanzar el error.

## §13 — Roadmap de fases

Regla global: una fase está terminada cuando cumple sus criterios, tiene sus `*.service.spec.ts` (modelos Mongoose mockeados con `jest.fn()`), su e2e si se indica, y `yarn lint && yarn build && yarn test` pasan.

| Fase | Contenido | Criterio de aceptación |
|---|---|---|
| **F0 — Infraestructura** | Dependencias (§3), `src/common/` completo (§4), `src/config/`, `main.ts`, `app.module.ts`, `ProvidersModule` (§9), `.env.example`. | App arranca, `GET /` responde `{ data: { status: 'ok' }, message }`, Swagger en `/docs`, e2e del health check con MongoMemoryServer. |
| **F1 — Auth + Users** | 7.1, 7.2. | Flujo completo registro→código (visible en logs del MailProvider)→password→login→refresh; recuperación; perfil + direcciones + activación de roles; CRUD admin. E2E del flujo de registro/login. |
| **F2 — Catálogos** | 7.3, 7.4. | CRUDs admin protegidos por rol; consumidor puede listar activos. |
| **F3 — Purifiers** | 7.5 (sin dashboard/heatmap ni metrics de suscripciones). | Crear purificadora con coordenadas, publicar precios, `GET /purifiers/nearby` con filtros funciona (índice 2dsphere verificado en e2e), ratings, vínculos con turnos. |
| **F4 — Delivery** | 7.6. | Perfil, inventario, precios, KYC mock end-to-end (subir → admin aprueba → `kycStatus` refleja), QR. |
| **F5 — Wallets** | 7.7. | Depósito mock acredita saldo + transacción; retiro descuenta deuda primero; historial paginado. |
| **F6 — Orders** | 7.8, §8 (sin puntos/cupones/referidos: los campos existen pero `discount=0`), §12, 8.6. | E2E: pedido efectivo `to_purifier` end-to-end (crear→aceptar→in_transit→deliver: comisión a deuda, inventario descontado); pedido wallet `open` end-to-end (bloqueo máximo→ajuste al aceptar→settlement); first-accept concurrente (dos accept, uno recibe 409); cancelaciones. |
| **F7 — Realtime + Notifications** | §10, 7.9, 7.10. | Gateway autentica por JWT; eventos de pedido y chat emitidos (e2e con cliente socket.io); chat REST respeta visibilidad 24 h y estados. |
| **F8 — Subscriptions** | 7.11, §11 (jobs 1 y 2). | Suscripción genera pedido al vencer `nextOrderAt` (test del service del job con fechas mockeadas); pausa/reanuda; timeout 30 min notifica. |
| **F9 — Coupons + Referrals + Loyalty** | 7.12, 7.13, 7.14, §8.4, §8.5, §8.7, job 3 de §11. | Cupón aplica y respeta límites; bienvenida solo primer pedido; no combinable con puntos; canjes de la tabla; FIFO y expiración; bonos de referido con tope mensual (tests de service exhaustivos de estas reglas). |
| **F10 — Negocio del purificador** | 7.15, 7.16, 7.17, 7.18, dashboard/heatmap de purificadora (7.5). | POS descuenta inventario y alimenta caja; cierre de caja cuadra; reporte CSV descargable. |
| **F11 — Soporte + Dashboard admin** | 7.19, 7.20, `format=csv` en listas admin, restore admin. | Métricas devuelven todos los bloques; heatmap agrupa por grilla; tickets end-to-end. |
| **F12 — Seed + E2E final** | `src/seed.ts` + script `yarn seed`. Seed: limpia colecciones (`deleteMany({})` vía `getModelToken`), crea: admin (`admin@aquaya.mx` / `Admin123!`), 4 tipos de agua y 4 tamaños (§5 de la definición), config de comisión (`percentage`, 3), 2 consumidores, 1 purificador con 2 purificadoras (CDMX, coordenadas reales) con precios e inventario, 1 repartidor vinculado y 1 independiente (ambos KYC aprobado, con precios/inventario), wallets con saldo, 1 cupón global, 1 suscripción, pedidos de ejemplo en varios estados. | `yarn seed` corre idempotente; suite e2e completa verde; README actualizado con cómo levantar el proyecto. |

## §14 — Variables de entorno (`.env.example`)

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `MONGODB_URI` | Conexión MongoDB | `mongodb://localhost:27017/aquaya` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secretos JWT | — (requeridas) |
| `JWT_ACCESS_EXPIRATION` / `JWT_REFRESH_EXPIRATION` | Vigencias | `15m` / `7d` |
| `CORS_ORIGIN` | Orígenes permitidos (coma) | `*` |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | Rate limiting | `60000` / `100` |
| `SWAGGER_USER` / `SWAGGER_PASSWORD` | Basic auth de `/docs` en producción | `admin` / `admin123` |
| `DEFAULT_SEARCH_RADIUS_KM` | Radio default de búsquedas | `5` |
| `ORDER_ACCEPT_TIMEOUT_MIN` | Aviso de pedido sin aceptar | `30` |
| `# STRIPE_SECRET_KEY`, `# FCM_*`, `# STORAGE_*`, `# MAIL_*` | Comentadas — integraciones futuras (D3), no requeridas en v1 | — |

## §15 — Definición de "hecho"

Global, además de los criterios por fase:
- `yarn lint && yarn build && yarn test` verdes; e2e de la fase verdes.
- Un `*.service.spec.ts` por servicio (modelos mockeados, sin DB).
- Swagger completo y navegable; todos los endpoints con `@ApiTags` + `@ApiBearerAuth` (+ `@Public()` documentado).
- Toda respuesta envuelta por TransformInterceptor (salvo CSV con `@SkipTransform()`).
- Mensajes al usuario en español; identificadores en inglés; endpoints kebab-case plural.
- Todo DELETE es soft delete (`deletedAt`); listas admin soportan `includeDeleted=true`.
- Ninguna llamada de red a servicios externos (solo mocks de §9).

## §16 — Decisiones tomadas durante la implementación

*(Sección viva: si durante la implementación surge un caso no cubierto, documenta aquí la decisión tomada con fecha y justificación.)*
