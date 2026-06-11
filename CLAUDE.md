# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Backend for **AQUA (AquaYa)**, a marketplace for purified-water delivery. The full business spec (roles: consumidor/purificador/repartidor/admin, wallet payments, subscriptions, loyalty, real-time order tracking, KYC) is in `docs/01-definition.md`.

**Current state:** the repo is a fresh NestJS 11 scaffold (`src/` contains only the default app module/controller/service). The target architecture — MongoDB + Mongoose, JWT auth, Swagger, soft delete — is fully specified in `docs/architecture.md` but not yet implemented; its dependencies (`@nestjs/mongoose`, `class-validator`, `@nestjs/swagger`, etc.) are not yet installed. **`docs/architecture.md` is the authoritative convention document — read it before implementing any module, and follow its templates exactly.**

## Commands

Package manager is **Yarn** (yarn.lock present).

```bash
yarn start:dev          # dev server with watch (port 3000, override with PORT)
yarn build              # nest build → dist/
yarn lint               # eslint with --fix
yarn format             # prettier --write on src/ and test/
yarn test               # unit tests (jest, *.spec.ts under src/)
yarn test path/to/file.spec.ts   # single test file
yarn test -t "test name"         # single test by name
yarn test:watch
yarn test:cov
yarn test:e2e           # jest --config ./test/jest-e2e.json (*.e2e-spec.ts under test/)
```

Planned per architecture doc (script not yet in package.json): `yarn seed` — destroys all collections and recreates test data via `src/seed.ts`.

## Architecture conventions (from docs/architecture.md)

Every business module lives in `src/modules/<name>/` with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.service.spec.ts`, plus `dto/`, `schemas/`, and optional `interfaces/`/`strategies/`. Shared infrastructure (guards, interceptors, filters, pipes, helpers, BaseSchema) lives in `src/common/` and never depends on business modules. New modules are scaffolded with `nest g resource modules/<name>` and registered in `app.module.ts`.

Request pipeline (all global): ThrottlerGuard → JwtAuthGuard (bypass with `@Public()`) → RolesGuard (reads `@Roles()`; no decorator = any authenticated user) → SoftDeleteInterceptor → controller → service → TransformInterceptor (wraps every response as `{ data, message }` or `{ data, meta, message }`) → HttpExceptionFilter (Mongo duplicate-key 11000 → 409 Conflict).

Load-bearing patterns:

- **Soft delete everywhere.** Every Mongoose schema is built as `SchemaFactory.createForClass(Entity).add(BaseSchema)`; BaseSchema adds `deletedAt` + timestamps. DELETE endpoints set `deletedAt`, never remove documents. Queries filter with `softDeleteCondition()` / `softDeleteQuery()` from `common/helpers/`.
- **Standard CRUD service shape.** `findAll(PaginationDto)` returns `PaginatedResult<T>` (`{ data, meta: { total, page, limit, totalPages } }`, limit capped at 100, sorted `createdAt: -1`); `update` uses findById + `Object.assign` + `save()` to preserve Mongoose hooks; `update`/`remove` verify existence first and throw `NotFoundException`.
- **DTOs** use class-validator; `UpdateXDto extends PartialType(CreateXDto)`; list DTOs extend `PaginationDto` (`search`, `page`, `limit`, `includeDeleted`).
- **Route params** validated with `ParseObjectIdPipe`; controllers carry `@ApiTags` + `@ApiBearerAuth`.
- **Language split:** code identifiers in English (camelCase); user-facing response strings in Spanish (e.g. `'Recurso no encontrado'`). Infra filenames kebab-case; endpoints kebab-case plural.

## Testing

- Unit tests (`*.spec.ts`) sit next to their service and mock Mongoose models with `jest.fn()` — no database connection.
- E2E tests (`test/*.e2e-spec.ts`) boot the full app (pipes, guards, interceptors) against `MongoMemoryServer` and use supertest.

## Environment

Config via `.env`: `PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, `SWAGGER_USER`, `SWAGGER_PASSWORD`. See the table at the end of `docs/architecture.md` for defaults.
