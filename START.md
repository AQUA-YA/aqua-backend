# AQUA (AquaYa) — Guía de inicio rápido

## Requisitos

- Node.js 18+
- Yarn
- MongoDB (local o Atlas)

## Configuración inicial

```bash
cp .env.example .env   # editar variables según entorno
yarn install
```

## Desarrollo

```bash
yarn start:dev
```

Servidor en `http://localhost:3000` con hot-reload.

## Producción

```bash
yarn build
yarn start:prod
```

O usando la variable de entorno `PORT` para cambiar el puerto.

## Swagger

La documentación interactiva está en `/docs`.

Credenciales de acceso: `admin` / `admin123`

## Seed

Puebla la base de datos con datos de prueba. **Destruye todos los datos existentes** antes de crearlos.

```bash
yarn seed
```

### Credenciales de prueba (post-seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@aquaya.mx | Admin123! |
| Consumidor | consumer1@example.com | Consumer123! |
| Consumidor | consumer2@example.com | Consumer123! |
| Purificador | purifier@example.com | Purifier123! |
| Repartidor (vinculado) | delivery-linked@example.com | Delivery123! |
| Repartidor (independiente) | delivery-independent@example.com | Delivery123! |

### Datos de ejemplo incluidos

- **Monederos:** consumer1 ($500), consumer2 ($200), purifier ($1000), deliveries ($300/$150)
- **Cupón:** `BIENVENIDO10` ($10 USD de descuento, válido hasta 2026-12-31)
- **Suscripción:** consumer1, semanal, 2 garrafones de 10L
- **Purificadores:** CDMX Centro y CDMX Norte
- **Comisión:** 3% por transacción

## Comandos útiles

```bash
yarn test           # pruebas unitarias
yarn test:e2e       # pruebas end-to-end
yarn lint           # ESLint con auto-fix
yarn format         # Prettier
```
