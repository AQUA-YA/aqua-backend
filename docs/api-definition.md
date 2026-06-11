# API Definition — AquaYa (AQUA)

> **Base URL:** `http://localhost:3000/api` (swagger: `/api/docs`)  
> **Response envelope:**  
> ```json
> { "data": ..., "message": "..." }
> ```
> Paginated: `{ "data": [...], "meta": { "total": N, "page": N, "limit": N, "totalPages": N }, "message": "..." }`

---

## Authentication

All endpoints require `Authorization: Bearer <token>` **except** those marked `🔓 Public`.

---

### Auth — `/auth`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/auth/register` | 🔓 | Envía código de verificación al email | `{ "email": "string" }` | `null` + message |
| POST | `/auth/verify-code` | 🔓 | Verifica código de registro | `{ "email": "string", "code": "string" }` | `null` |
| POST | `/auth/set-password` | 🔓 | Establece contraseña tras verificar | `{ "email": "string", "code": "string", "password": "string (min 8)" }` | `{ "accessToken", "refreshToken", "user": { ... } }` |
| POST | `/auth/login` | 🔓 | Inicio de sesión | `{ "email": "string", "password": "string" }` | `{ "accessToken", "refreshToken", "user": { ... } }` |
| POST | `/auth/refresh` | 🔓 | Renueva tokens | `{ "refreshToken": "string" }` | `{ "accessToken", "refreshToken", "user": { ... } }` |
| POST | `/auth/forgot-password` | 🔓 | Envía código para recuperar contraseña | `{ "email": "string" }` | `null` + message |
| POST | `/auth/reset-password` | 🔓 | Restablece contraseña | `{ "email": "string", "code": "string", "newPassword": "string (min 8)" }` | `null` |
| GET | `/auth/me` | Bearer | Perfil del usuario autenticado | — | `{ "_id", "email", "firstName", "lastName", "roles", "avatar", "phone", "birthDate", "gender", "referralCode", ... }` |

---

### Users — `/users`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| PATCH | `/users/me/profile` | Bearer | Actualiza perfil propio | `{ "firstName"?, "lastName"?, "birthDate"?, "gender"?, "referralCode"? }` | Usuario actualizado |
| PATCH | `/users/me/avatar` | Bearer | Actualiza avatar (base64) | `{ "file": "string (base64)" }` | Usuario con `avatar` |
| POST | `/users/me/addresses` | Bearer | Agrega dirección | `{ "alias": "string", "street": "string", "city": "string", "neighborhood"?, "zipCode"?, "reference"?, "location"?: { "lat": num, "lng": num }, "isPrimary"? }` | Dirección creada |
| PATCH | `/users/me/addresses/:addressId` | Bearer | Actualiza dirección | Mismo body que POST | Dirección actualizada |
| DELETE | `/users/me/addresses/:addressId` | Bearer | Elimina dirección | — | `null` |
| POST | `/users/me/roles/purifier` | Bearer | Solicita rol purificador | — | Usuario con `roles` actualizado |
| POST | `/users/me/roles/delivery` | Bearer | Solicita rol repartidor | — | Usuario con `roles` actualizado |
| GET | `/users` | Bearer + ADMIN | Lista usuarios | `?search=&page=1&limit=20&role=consumer\|purifier\|delivery\|admin&includeDeleted=false` | Paginado |
| GET | `/users/:id` | Bearer + ADMIN | Obtiene usuario por ID | — | Usuario |
| PATCH | `/users/:id` | Bearer + ADMIN | Actualiza usuario (admin) | `{ "roles"?: array, "isSuspended"?: bool }` | Usuario actualizado |
| PATCH | `/users/:id/restore` | Bearer + ADMIN | Restaura usuario eliminado | — | Usuario restaurado |
| DELETE | `/users/:id` | Bearer + ADMIN | Elimina usuario (soft) | — | `{ "deletedAt": date }` |

---

### Orders — `/orders`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/orders` | Bearer + CONSUMER | Crea pedido | `{ "mode": "open\|to_purifier\|to_delivery", "targetPurifierId"?, "targetDeliveryUserId"?, "waterTypeId": "string", "bottleSizeId": "string", "quantity": num (min 1), "addressId"?, "deliveryAddress"?: { "street", "city", ... }, "tip"?, "paymentMethod": "cash\|wallet", "couponCode"?, "redeemPoints"?, "requiresEmptyPickup"? }` | Order creado |
| GET | `/orders/available` | Bearer + PURIFIER, DELIVERY | Pedidos disponibles cerca | `?lat=&lng=&radiusKm=` | `[{ Order }]` |
| POST | `/orders/:id/accept` | Bearer + PURIFIER, DELIVERY | Acepta pedido (first-accept) | — | Order con `acceptedById`, `fulfillingPurifierId` |
| POST | `/orders/:id/assign` | Bearer + PURIFIER | Asigna repartidor | `{ "deliveryUserId": "string" }` | Order con `assignedDeliveryUserId` |
| PATCH | `/orders/:id/status` | Bearer | Actualiza estado | `{ "status": "accepted\|in_transit\|empty_pickup\|delivered" }` | Order actualizado |
| POST | `/orders/:id/deliver` | Bearer | Entrega + settle | `{ "emptyBottleReturned"? }` | Order + wallet settlement |
| POST | `/orders/:id/cancel` | Bearer | Cancela pedido | `{ "reason": "string" }` | Order cancelado |
| GET | `/orders/mine` | Bearer + CONSUMER | Mis pedidos | `?status=&page=&limit=` | Paginado |
| GET | `/orders/assigned` | Bearer + PURIFIER, DELIVERY | Pedidos asignados | `?status=&page=&limit=` | Paginado |
| GET | `/orders` | Bearer + ADMIN | Todos los pedidos | `?status=&search=&page=&limit=&format=json\|csv` | Paginado |
| GET | `/orders/:id` | Bearer | Detalle de pedido | — | Order completo |

---

### Wallets — `/wallets`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/wallets/me` | Bearer | Saldo y wallet | — | `{ "balance", "totalDeposited", "totalEarned", "totalSpent" }` |
| POST | `/wallets/me/deposits` | Bearer | Depositar fondos | `{ "amount": num (min 1) }` | `{ "transaction": {...}, "newBalance": num }` |
| POST | `/wallets/me/withdrawals` | Bearer + PURIFIER, DELIVERY | Retirar fondos | `{ "amount": num (min 1) }` | `{ "transaction": {...}, "newBalance": num }` |
| GET | `/wallets/me/transactions` | Bearer | Historial transacciones | `?type=deposit\|payment\|earning\|&page=&limit=` | Paginado |

---

### Delivery — `/delivery`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/delivery/me/profile` | Bearer + DELIVERY | Perfil delivery | — | `DeliveryProfile` |
| PATCH | `/delivery/me/profile` | Bearer + DELIVERY | Actualiza perfil | `{ "hasOwnInventory"?, "deliveryFee"? }` | Perfil actualizado |
| PATCH | `/delivery/me/availability` | Bearer + DELIVERY | Cambia disponibilidad | `{ "isAvailable": bool }` | `DeliveryProfile` |
| GET | `/delivery/me/inventory` | Bearer + DELIVERY | Inventario propio | — | `[{ "waterTypeId", "bottleSizeId", "quantity" }]` |
| PUT | `/delivery/me/inventory` | Bearer + DELIVERY | Upsert inventario | `{ "items": [{ "waterTypeId", "bottleSizeId", "quantity" }] }` | `[{ ... }]` |
| GET | `/delivery/me/prices` | Bearer + DELIVERY | Precios propios | — | `[{ "waterTypeId", "bottleSizeId", "price" }]` |
| PUT | `/delivery/me/prices` | Bearer + DELIVERY | Upsert precios | `{ "items": [{ "waterTypeId", "bottleSizeId", "price" }] }` | `[{ ... }]` |
| POST | `/delivery/me/kyc` | Bearer + DELIVERY | Envía KYC | `{ "idPhoto": "string", "selfie": "string" }` | `KycVerification` |
| GET | `/delivery/me/kyc` | Bearer + DELIVERY | Estado KYC | — | `KycVerification` |
| GET | `/delivery/me/qr` | Bearer + DELIVERY | Genera QR token | — | `{ "qrToken" }` |
| POST | `/delivery/verify-qr` | 🔓 | Verifica QR | `{ "qrToken": "string" }` | `{ "deliveryUser": {...} }` |
| GET | `/delivery/me/deliveries` | Bearer + DELIVERY | Entregas realizadas | `?page=&limit=` | Paginado |

---

### KYC Admin — `/kyc-verifications`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/kyc-verifications` | Bearer + ADMIN | Lista verificaciones | `?status=pending\|approved\|rejected&page=&limit=` | Paginado |
| PATCH | `/kyc-verifications/:id` | Bearer + ADMIN | Revisa KYC | `{ "status": "approved\|rejected", "rejectionReason"?: "string" }` | `KycVerification` actualizada |

---

### Purifiers — `/purifiers`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/purifiers` | Bearer + PURIFIER | Crea purificadora | `{ "name", "address", "lat", "lng", "schedule"?, "phone"?, "photos"?, "description"?, "waterTypeIds"?, "bottleSizeIds"?, "deliveryFee"? }` | Purifier |
| GET | `/purifiers/mine` | Bearer + PURIFIER | Mis purificadoras | — | `[Purifier]` |
| GET | `/purifiers/nearby` | Bearer | Purificadoras cercanas | `?lat=&lng=&radiusKm=&waterTypeId=&bottleSizeId=&search=` | `[{ distance, ... }]` |
| GET | `/purifiers/:id` | Bearer | Detalle | — | Purifier |
| PATCH | `/purifiers/:id` | Bearer (owner) | Actualiza | `Partial<CreatePurifierDto>` | Purifier |
| DELETE | `/purifiers/:id` | Bearer (owner) | Soft delete | — | `{ deletedAt }` |
| GET | `/purifiers/:id/prices` | Bearer | Precios | — | `[{ waterTypeId, bottleSizeId, price }]` |
| PUT | `/purifiers/:id/prices` | Bearer + PURIFIER (owner) | Upsert precios | `{ "prices": [{ "waterTypeId", "bottleSizeId", "price" }] }` | `[{ ... }]` |
| POST | `/purifiers/:id/ratings` | Bearer + CONSUMER | Califica | `{ "orderId", "score": 1-5, "comment"? }` | Rating |
| GET | `/purifiers/:id/ratings` | Bearer | Calificaciones | `?page=&limit=` | Paginado |
| POST | `/purifiers/:id/delivery-links` | Bearer + PURIFIER (owner) | Vincula repartidor | `{ "deliveryUserId", "shift"? }` | DeliveryLink |
| GET | `/purifiers/:id/delivery-links` | Bearer | Vinculaciones | — | `[DeliveryLink]` |
| PATCH | `/purifiers/:id/delivery-links/:linkId` | Bearer + PURIFIER (owner) | Actualiza vínculo | `{ "shift"? }` | DeliveryLink |
| DELETE | `/purifiers/:id/delivery-links/:linkId` | Bearer + PURIFIER (owner) | Elimina vínculo | — | `null` |

---

### Water Types — `/water-types`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/water-types` | Bearer + ADMIN | Crea tipo de agua | `{ "name", "description"?, "isActive"? }` | WaterType |
| GET | `/water-types` | Bearer | Lista | `?search=&page=&limit=` | Paginado |
| GET | `/water-types/:id` | Bearer | Detalle | — | WaterType |
| PATCH | `/water-types/:id` | Bearer + ADMIN | Actualiza | `Partial<CreateWaterTypeDto>` | WaterType |
| DELETE | `/water-types/:id` | Bearer + ADMIN | Soft delete | — | `{ deletedAt }` |

---

### Bottle Sizes — `/bottle-sizes`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/bottle-sizes` | Bearer + ADMIN | Crea tamaño | `{ "liters", "name"?, "isActive"? }` | BottleSize |
| GET | `/bottle-sizes` | Bearer | Lista | `?search=&page=&limit=` | Paginado |
| GET | `/bottle-sizes/:id` | Bearer | Detalle | — | BottleSize |
| PATCH | `/bottle-sizes/:id` | Bearer + ADMIN | Actualiza | `Partial<CreateBottleSizeDto>` | BottleSize |
| DELETE | `/bottle-sizes/:id` | Bearer + ADMIN | Soft delete | — | `{ deletedAt }` |

---

### Commission Config — `/commission-config`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/commission-config` | Bearer | Config vigente | — | CommissionConfig |
| PUT | `/commission-config` | Bearer + ADMIN | Crea/actualiza | `{ "type": "fixed\|percentage\|disabled", "value": num (0-100) }` | CommissionConfig |
| GET | `/commission-config/history` | Bearer + ADMIN | Historial cambios | `?page=&limit=` | Paginado |

---

### Coupons — `/coupons`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/coupons` | Bearer + ADMIN, PURIFIER | Crea cupón | `{ "code"?, "type": "amount\|percentage\|two_for_one\|free_delivery", "value": num, "purifierId"?, "maxUses"?, "maxUsesPerUser"?, "startsAt": date, "endsAt": date, "isWelcome"? }` | Coupon |
| GET | `/coupons` | Bearer + ADMIN | Lista cupones | `?page=&limit=` | Paginado |
| GET | `/coupons/mine` | Bearer + PURIFIER | Cupones propios | — | `[Coupon]` |
| PATCH | `/coupons/:id` | Bearer (owner) | Actualiza | `Partial<UpdateCouponDto>` | Coupon |
| DELETE | `/coupons/:id` | Bearer (owner) | Soft delete | — | `{ deletedAt }` |
| POST | `/coupons/validate` | Bearer | Valida cupón | `{ "code", "purifierId"?, "subtotal": num, "deliveryFee": num }` | `{ "valid": true, "discount": num, ... }` |

---

### Subscriptions — `/subscriptions`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/subscriptions` | Bearer + CONSUMER | Crea suscripción | `{ "purifierId"?, "waterTypeId", "bottleSizeId", "quantity": num (min 1), "frequency": "weekly\|biweekly\|monthly", "dayOfWeek"?: 0-6, "hour"?, "deliveryAddress"?: { ... }, "paymentMethod"? }` | Subscription |
| GET | `/subscriptions/mine` | Bearer + CONSUMER | Mis suscripciones | `?page=&limit=` | Paginado |
| GET | `/subscriptions/:id` | Bearer + CONSUMER | Detalle | — | Subscription |
| PATCH | `/subscriptions/:id` | Bearer + CONSUMER | Actualiza | `Partial<CreateSubscriptionDto>` | Subscription |
| POST | `/subscriptions/:id/pause` | Bearer + CONSUMER | Pausa | — | Subscription (`isPaused: true`) |
| POST | `/subscriptions/:id/resume` | Bearer + CONSUMER | Reanuda | — | Subscription (`isPaused: false`) |
| DELETE | `/subscriptions/:id` | Bearer + CONSUMER | Cancela (soft) | — | `{ deletedAt }` |
| GET | `/subscriptions/:id/orders` | Bearer + CONSUMER | Pedidos generados | `?page=&limit=` | Paginado |

---

### Loyalty — `/loyalty`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/loyalty/me` | Bearer | Puntos + historial | `?page=&limit=` | `{ "totalPoints", "entries": Paginated }` |
| POST | `/loyalty/events` | Bearer + ADMIN, PURIFIER | Crea evento (multiplicador) | `{ "name", "multiplier": num (min 1), "waterTypeId"?, "purifierId"?, "startsAt": date, "endsAt": date, "isActive"? }` | LoyaltyEvent |
| GET | `/loyalty/events` | Bearer | Lista eventos | `?page=&limit=` | Paginado |
| PATCH | `/loyalty/events/:id` | Bearer (owner) | Actualiza evento | `Partial<UpdateLoyaltyEventDto>` | LoyaltyEvent |
| DELETE | `/loyalty/events/:id` | Bearer (owner) | Elimina evento | — | `{ deletedAt }` |

---

### Referrals — `/referrals`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/referrals/me` | Bearer | Estadísticas referidos | — | `{ "totalReferrals", "totalBonusEarned", "currentMonthBonus", "monthlyCap" }` |

---

### Notifications — `/notifications`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/notifications/tokens` | Bearer | Registra/actualiza token push | `{ "token": "string", "platform": "ios\|android" }` | `{ token }` |
| DELETE | `/notifications/tokens/:token` | Bearer | Elimina token | — | `null` |

---

### Chat — `/orders/:id/messages`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/orders/:id/messages` | Bearer | Mensajes del pedido | `?page=&limit=` | Paginado |
| POST | `/orders/:id/messages` | Bearer | Envía mensaje | `{ "messageType"?: "text\|location\|photo", "content": "string" }` | ChatMessage |

---

### Support Tickets — `/support-tickets`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/support-tickets` | Bearer | Crea ticket | `{ "orderId"?, "subject", "description", "attachments"? }` | SupportTicket |
| GET | `/support-tickets/mine` | Bearer | Mis tickets | `?status=&page=&limit=` | Paginado |
| GET | `/support-tickets` | Bearer + ADMIN | Todos los tickets | `?status=&page=&limit=` | Paginado |
| GET | `/support-tickets/:id` | Bearer | Detalle | — | SupportTicket |
| PATCH | `/support-tickets/:id` | Bearer + ADMIN | Responde/cierra | `{ "status"?: "open\|in_progress\|closed", "adminResponse"? }` | SupportTicket |

---

### Dashboard — `/dashboard`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/dashboard/metrics` | Bearer + ADMIN | Métricas globales | `?from=date&to=date` | `{ "totalUsers", "totalOrders", "totalRevenue", "activeSubscriptions", "totalReferrals", "pendingKycs", "topPurifiers" }` |
| GET | `/dashboard/heatmap` | Bearer + ADMIN | Mapa de calor pedidos | `?from=date&to=date` | `[{ "lat", "lng", "count" }]` |

---

### Purifier Business — `/purifiers/:id/inventory`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/purifiers/:id/inventory` | Bearer + PURIFIER, ADMIN | Inventario | — | `[{ bottleSizeId, availableQuantity, availableSeals, lowStockThreshold }]` |
| PUT | `/purifiers/:id/inventory` | Bearer + PURIFIER | Actualiza inventario | `[{ "bottleSizeId", "availableQuantity": num, "availableSeals": num, "lowStockThreshold"? }]` | Mismo array |
| POST | `/purifiers/:id/inventory/movements` | Bearer + PURIFIER | Registra movimiento | `{ "bottleSizeId", "type": "in\|out\|adjustment", "quantity": num, "seals"?, "reason" }` | InventoryMovement |
| GET | `/purifiers/:id/inventory/movements` | Bearer + PURIFIER, ADMIN | Historial movimientos | `?page=&limit=` | Paginado |

### Purifier Business — `/purifiers/:id/store-sales`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/purifiers/:id/store-sales` | Bearer + PURIFIER | Venta directa (POS) | `{ "waterTypeId", "bottleSizeId", "quantity": num (min 1), "total": num (min 0), "paymentMethod": "cash\|wallet\|transfer" }` | StoreSale (auto-deduce inventario + registra caja) |
| GET | `/purifiers/:id/store-sales` | Bearer + PURIFIER, ADMIN | Lista ventas | `?from=&to=&page=&limit=` | Paginado |

### Purifier Business — `/purifiers/:id/cash-registers`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| POST | `/purifiers/:id/cash-registers` | Bearer + PURIFIER | Abre caja | `{ "date"?, "openingBalance": num (min 0) }` | CashRegister |
| POST | `/purifiers/:id/cash-registers/:registerId/entries` | Bearer + PURIFIER | Agrega movimiento | `{ "type": "income\|expense", "concept", "amount": num }` | CashEntry |
| POST | `/purifiers/:id/cash-registers/:registerId/close` | Bearer + PURIFIER | Cierra caja | — | CashRegister (con balance final) |
| GET | `/purifiers/:id/cash-registers` | Bearer + PURIFIER, ADMIN | Lista cierres | `?page=&limit=` | Paginado |

### Purifier Business — `/purifiers/:id/reports`

| Método | Ruta | Auth | Descripción | Request | Response `data` |
|--------|------|------|-------------|---------|-----------------|
| GET | `/purifiers/:id/reports/sales` | Bearer + PURIFIER, ADMIN | Reporte ventas (CSV/JSON) | `?period=daily\|weekly\|monthly&from=&to=&format=json\|csv` | Array de filas (JSON) o descarga CSV |

---

### Health — `/`

| Método | Ruta | Auth | Descripción | Response `data` |
|--------|------|------|-------------|-----------------|
| GET | `/` | 🔓 | Health check | `{ "status": "ok", "timestamp": ISO, "uptime": seconds }` |

---

## Errores

Todos los errores siguen el formato:

```json
{
  "statusCode": 400,
  "message": "Mensaje de error en español",
  "error": "Bad Request"
}
```

| Código | Significado |
|--------|-------------|
| 400 | Validation error / Bad request |
| 401 | No token / Token inválido / Credenciales inválidas |
| 403 | No tiene el rol requerido |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ej. email duplicado) |
| 429 | Rate limit excedido |
| 500 | Error interno |

---

## Enumeradores

| Enum | Valores |
|------|---------|
| `Role` | `consumer`, `purifier`, `delivery`, `admin` |
| `OrderStatus` | `pending`, `accepted`, `in_transit`, `empty_pickup`, `delivered`, `cancelled` |
| `OrderMode` | `open`, `to_purifier`, `to_delivery` |
| `PaymentMethod` | `cash`, `wallet` |
| `TransactionType` | `deposit`, `payment`, `earning`, `commission`, `withdrawal`, `referral_bonus`, `points_redemption`, `refund` |
| `CouponType` | `amount`, `percentage`, `two_for_one`, `free_delivery` |
| `SubscriptionFrequency` | `weekly`, `biweekly`, `monthly` |
| `ChatMessageType` | `text`, `location`, `photo` |
| `TicketStatus` | `open`, `in_progress`, `closed` |
| `KycStatus` | `pending`, `approved`, `rejected` |
| `CommissionType` | `fixed`, `percentage`, `disabled` |
| `InventoryMovementType` | `in`, `out`, `adjustment` |
| `CashEntryType` | `income`, `expense` |
| `StoreSalePaymentMethod` | `cash`, `wallet`, `transfer` |

---

---

## WebSockets — Tiempo Real

**Conexión:** `ws://localhost:3000` (mismo puerto HTTP)  
**Handshake auth:** `{ auth: { token: "<JWT_ACCESS_TOKEN>" } }`

Al conectar, el usuario entra automáticamente a su sala personal `user:{userId}` donde recibe eventos directos.

### Salas (Rooms)

| Sala | Propósito | Ingresa |
|------|-----------|---------|
| `user:{userId}` | Eventos personales | Automático al conectar |
| `order:{orderId}` | Eventos de una orden | Cliente envía `order.join` |

---

### Eventos Cliente → Servidor (client emit)

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `order.join` | `string` (orderId) | Unirse a sala de una orden para recibir actualizaciones |
| `order.leave` | `string` (orderId) | Salir de sala de orden |
| `order.location.update` | `{ orderId, lat: number, lng: number }` | Repartidor actualiza ubicación en tiempo real |
| `chat.send` | `{ orderId, messageType?: "text"\|"location"\|"photo", content }` | Enviar mensaje de chat en una orden activa |

---

### Eventos Servidor → Cliente (server emit)

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `order.location` | `{ orderId, lat, lng }` | Broadcast de ubicación a sala `order:{orderId}` |
| `chat.message` | `ChatMessage` (objeto completo) | Nuevo mensaje de chat broadcast a sala `order:{orderId}` |

### Eventos planificados (infraestructura lista, pendiente conectar)

Los métodos `RealtimeService.emitToUser(userId, event, data)` y `RealtimeService.emitToOrder(orderId, event, data)` existen y están exportados para ser usados desde cualquier servicio. Eventos típicos que se emitirán:

| Evento (ejemplo) | Sala destino | Cuándo |
|------------------|-------------|--------|
| `order.new` | `user:{purifierId}` | Nuevo pedido disponible para purificadores cercanos |
| `order.status` | `order:{orderId}` | Cambio de estado (pending→accepted→in_transit→delivered) |
| `order.assigned` | `user:{deliveryUserId}` | Repartidor asignado a una orden |
| `order.cancelled` | `order:{orderId}` | Orden cancelada |
| `order.updated` | `order:{orderId}` | Actualización de datos de la orden |
| `kyc.status` | `user:{userId}` | Cambio de estado de verificación KYC |

---

> **Total de endpoints REST: 119 • Eventos WebSocket client→server: 4 • server→client: 2 (+ planificados)**  
> **Swagger UI:** `http://localhost:3000/api/docs` (protegido con `SWAGGER_USER` / `SWAGGER_PASSWORD`)
