# Arquitectura del Proyecto

Stack base: **NestJS 10 + Mongoose (MongoDB) + JWT + Swagger**

---

## Estructura de directorios

```
src/
├── main.ts                        # Entry point: bootstrap, CORS, Swagger, ValidationPipe global
├── app.module.ts                  # Módulo raíz: importa todos los módulos, registra providers globales
├── app.controller.ts              # Health-check público en GET /
├── seed.ts                        # Script independiente que destruye datos existentes y crea datos de prueba
│
├── common/                        # Infraestructura compartida (no depende de ningún módulo)
│   ├── decorators/                # Decoradores personalizados (@Public, @Roles, @CurrentUser)
│   ├── filters/                   # Filtros de excepción (unifica errores HTTP y MongoDB)
│   ├── guards/                    # Guards de autenticación y autorización
│   ├── helpers/                   # Funciones utilitarias (soft-delete queries)
│   ├── interceptors/              # Interceptors globales (transformación de respuesta, soft-delete default)
│   ├── interfaces/                # Interfaces compartidas (paginación)
│   ├── pipes/                     # Pipes personalizados (validación de ObjectId)
│   └── schemas/                   # Schemas base (BaseSchema con timestamps y soft delete)
│
├── config/                        # Configuración (Swagger, etc.)
│
└── modules/                       # Módulos de negocio (cada uno es un dominio independiente)
    ├── <module>/
    │   ├── <module>.module.ts     # Declaración del módulo NestJS
    │   ├── <module>.controller.ts # Rutas/endpoints
    │   ├── <module>.service.ts    # Lógica de negocio
    │   ├── <module>.service.spec.ts # Tests unitarios
    │   ├── dto/                   # Data Transfer Objects (validación con class-validator)
    │   ├── schemas/               # Schemas de Mongoose (modelos de datos)
    │   ├── interfaces/            # Interfaces específicas del módulo (opcional)
    │   └── strategies/            # Estrategias (Passport, etc.) (opcional)
    └── ...
```

---

## Convenciones por capa

### Módulo (`*.module.ts`)

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }]),
  ],
  controllers: [EntityController],
  providers: [EntityService],
  exports: [EntityService], // si otro módulo lo necesita
})
export class EntityModule {}
```

- Un módulo por dominio de negocio.
- Los schemas de Mongoose se registran vía `MongooseModule.forFeature`.
- Se exporta el servicio si otros módulos requieren inyectarlo.

### Controlador (`*.controller.ts`)

```typescript
@ApiTags('entities')
@ApiBearerAuth()
@Controller('entities')
export class EntityController {
  constructor(private readonly service: EntityService) {}

  @Get()
  @Roles('admin')
  async findAll(@Query() query: PaginationDto) {
    return this.service.findAll(query);
  }

  @Post()
  async create(@Body() dto: CreateEntityDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateEntityDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(id);
  }
}
```

- Decorar con `@ApiTags`, `@ApiBearerAuth`, `@Controller`.
- Endpoints RESTful estándar: GET list, POST create, GET one, PATCH update, DELETE soft-delete.
- Parámetros `:id` se validan con `ParseObjectIdPipe`.
- Métodos `findAll` aceptan query params de paginación (`search`, `page`, `limit`, `includeDeleted`).

### Servicio (`*.service.ts`)

```typescript
@Injectable()
export class EntityService {
  constructor(
    @InjectModel(Entity.name) private readonly model: Model<EntityDocument>,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<Entity>> {
    const { search, page = 1, limit = 20, includeDeleted = 'false' } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: FilterQuery<EntityDocument> = softDeleteCondition(
      includeDeleted === 'true',
    );

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async create(dto: CreateEntityDto): Promise<Entity> {
    return this.model.create(dto);
  }

  async findOne(id: string): Promise<Entity> {
    const entity = await this.model.findById(id).exec();
    if (!entity) throw new NotFoundException('Recurso no encontrado');
    return entity;
  }

  async update(id: string, dto: UpdateEntityDto): Promise<Entity> {
    const entity = await this.model.findById(id).exec();
    if (!entity) throw new NotFoundException('Recurso no encontrado');
    Object.assign(entity, dto);
    return entity.save();
  }

  async remove(id: string): Promise<void> {
    const entity = await this.model
      .findOne(softDeleteQuery(false), { _id: id })
      .exec();
    if (!entity) throw new NotFoundException('Recurso no encontrado');
    (entity as any).deletedAt = new Date();
    await entity.save();
  }
}
```

- Métodos CRUD estándar: `findAll`, `create`, `findOne`, `update`, `remove`.
- `findAll` usa `softDeleteCondition` y `PaginationDto` con `search` síncrono.
- `create` usa `this.model.create(dto)`.
- `findOne` lanza `NotFoundException` si no existe.
- `update` usa patrón `findById` + `Object.assign` + `save()` para respetar hooks de Mongoose.
- `remove` usa `findOne` + `softDeleteQuery` + `deletedAt`.
- `update` y `remove` siempre verifican existencia antes de operar.

### Schema (`schemas/*.schema.ts`)

```typescript
export class Entity {
  @Prop({ required: true, unique: true, uppercase: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OtherEntity',
    required: true,
  })
  otherEntityId: string;
}

export const EntitySchema =
  SchemaFactory.createForClass(Entity).add(BaseSchema);
```

- Todos los schemas extienden `BaseSchema` (agrega `createdAt`, `updatedAt`, `deletedAt`).
- Usar siempre `SchemaFactory.createForClass(Entity).add(BaseSchema)`.

### DTO (`dto/*.dto.ts`)

```typescript
export class CreateEntityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional() // solo en Update*
  code?: string;
}

export class UpdateEntityDto extends PartialType(CreateEntityDto) {}
```

- Usar `class-validator` para validación.
- `Update*Dto` extiende `PartialType(CreateEntityDto)` para hacer todos los campos opcionales.
- Los DTOs de listado extienden `PaginationDto` con filtros adicionales.

---

## Infraestructura común (`src/common/`)

### BaseSchema

```typescript
export const BaseSchema = new mongoose.Schema(
  { deletedAt: { type: Date, default: null } },
  { timestamps: true },
);
```

- Todos los schemas la incorporan con `.add(BaseSchema)`.
- `timestamps: true` agrega `createdAt` y `updatedAt` automáticos.
- `deletedAt` permite soft-delete sin modificar el documento original.

### Guards

| Guard          | Función                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| `JwtAuthGuard` | Global. Valida JWT Bearer token. Permite bypass con `@Public()`.               |
| `RolesGuard`   | Global. Lee `@Roles()` del handler. Si no hay roles definidos, permite acceso. |

### Decoradores

| Decorador                   | Uso                                             |
| --------------------------- | ----------------------------------------------- |
| `@Public()`                 | Marca un endpoint como público (bypass de JWT). |
| `@Roles('admin', 'editor')` | Restringe acceso por rol.                       |
| `@CurrentUser()`            | Extrae `req.user` (tipo `JwtPayload`).          |

### Interceptors

| Interceptor             | Función                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| `TransformInterceptor`  | Envuelve toda respuesta en `{ data, message }` o `{ data, meta, message }`.  |
| `SoftDeleteInterceptor` | Por defecto establece `includeDeleted=false` en queries si no se especifica. |

### Filter

| Filter                | Función                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `HttpExceptionFilter` | Unifica errores. Código 11000 de MongoDB (duplicado) → 409 Conflict. |

### Helpers

- `softDeleteCondition(includeDeleted)` — filtro para `find`/`countDocuments`.
- `softDeleteQuery(includeDeleted)` — filtro para `findOne`/`findByIdAndUpdate`.

### Interfaces

- `PaginationMeta` — `{ total, page, limit, totalPages }`
- `PaginatedResult<T>` — `{ data: T[], meta: PaginationMeta }`
- `PaginationDto` — `{ search?, page?, limit?, includeDeleted? }`

### Pipes

- `ParseObjectIdPipe` — valida que un string sea un ObjectId de MongoDB válido.

---

## Módulos del sistema

Cada módulo de negocio vive en `src/modules/<name>/` y sigue el mismo patrón de capas (module, controller, service, schemas, dto).

### Patrones de diseño según el tipo de módulo

- **CRUD simple**: Un solo controller + service + schema.
- **Recursos anidados** (ej: `padres/:parentId/hijos`): Rutas anidadas en un solo controller, todo en el mismo módulo.
- **Múltiples dominios**: Varios controllers y services dentro del mismo módulo cuando los dominios están fuertemente acoplados.
- **Endpoints públicos y privados**: Decorar los públicos con `@Public()` para bypass de JWT.
- **Solo lectura o agregación**: Sin DTOs ni schemas propios; consumen datos de otros módulos.

---

## Flujo de una petición

```
Cliente
  ↓
ThrottlerGuard (límite de tasa)
  ↓
JwtAuthGuard (valida JWT o bypass si @Public)
  ↓
RolesGuard (verifica rol si @Roles presente)
  ↓
SoftDeleteInterceptor (default includeDeleted=false)
  ↓
Controller (valida params con pipes, body con ValidationPipe)
  ↓
Service (lógica de negocio, consultas a MongoDB)
  ↓
TransformInterceptor (envuelve response como { data, message })
  ↓
HttpExceptionFilter (captura errores si ocurren)
  ↓
Cliente
```

---

## Convenciones de nomenclatura

| Elemento            | Convención                | Ejemplo                                       |
| ------------------- | ------------------------- | --------------------------------------------- |
| Módulos             | PascalCase, singular      | `entities.module.ts`                          |
| Controladores       | PascalCase, plural        | `entities.controller.ts`                      |
| Servicios           | PascalCase, singular      | `entities.service.ts`                         |
| Schemas             | PascalCase, singular      | `entity.schema.ts`                            |
| DTOs                | PascalCase, verbo+Entidad | `CreateEntityDto`, `UpdateEntityDto`          |
| Interfaces          | PascalCase                | `PaginationMeta`, `JwtPayload`                |
| Decoradores         | kebab-case                | `public.decorator.ts`                         |
| Guards              | kebab-case                | `roles.guard.ts`                              |
| Interceptors        | kebab-case                | `transform.interceptor.ts`                    |
| Filtros             | kebab-case                | `http-exception.filter.ts`                    |
| Pipes               | kebab-case                | `parse-object-id.pipe.ts`                     |
| Helpers             | kebab-case                | `soft-delete.helper.ts`                       |
| Directorios         | kebab-case, plural        | `decorators/`, `guards/`, `dto/`, `schemas/`  |
| Endpoints           | kebab-case, plural        | `GET /entities`, `PATCH /entities/:id/action` |
| Colecciones MongoDB | plural automático         | `entities`                                    |
| Variables en inglés | camelCase                 | `createdAt`, `deletedAt`                      |
| Mensajes en español | Strings de respuesta      | `'Recurso no encontrado'`                     |

---

## Roles

El sistema usa control de acceso basado en roles (RBAC). Los roles se definen según las necesidades del negocio.

- Los roles se asignan al crear un usuario y se verifican con `@Roles()` + `RolesGuard`.
- Endpoints sin `@Roles()` permiten acceso a cualquier usuario autenticado.
- Endpoints con `@Public()` permiten acceso sin autenticación.

Para definir los roles del proyecto, crear un enum o tipo en `src/common/interfaces/`:

```typescript
export enum Role {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}
```

Luego se usa en los decoradores:

```typescript
@Roles(Role.ADMIN, Role.EDITOR)
```

---

## Seed

El archivo `src/seed.ts` destruye todas las colecciones y crea datos de prueba. Se ejecuta con:

```bash
yarn seed   # ts-node -r tsconfig-paths/register src/seed.ts
```

Flujo del seed:

1. Obtener todos los modelos mediante `getModelToken()`.
2. Eliminar todos los documentos de todas las colecciones (`deleteMany({})`).
3. Crear datos de prueba en orden respetando dependencias entre entidades.

---

## Pruebas

### Unitarias (`*.spec.ts`)

- Cobertura por servicio, junto al archivo de origen.
- Usan mocks de Mongoose con `jest.fn()`.
- No requieren conexión a base de datos.

```bash
yarn test
```

### E2E (`test/*.e2e-spec.ts`)

- Usan `MongoMemoryServer` para base de datos en memoria.
- Configuran la app completa (pipes, guards, interceptors).
- Usan `supertest` para peticiones HTTP.

```bash
yarn test:e2e
```

---

## Cómo crear un nuevo módulo

1. Generar el esqueleto con el CLI de NestJS:

   ```bash
   nest g resource modules/<name>
   ```

   Elegir `REST API` como capa de transporte y `No` para generar CRUD entry points (se reemplazarán con los propios).

2. Agregar `<name>Module` a los `imports` de `app.module.ts` (si el CLI no lo hizo automáticamente).

3. Modificar los archivos generados:

   - **Module**: importar `MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }])`.
   - **Schema**: crear `schemas/<name>.schema.ts` (extender `BaseSchema`).
   - **DTOs**: crear `dto/create-<name>.dto.ts` y `dto/update-<name>.dto.ts`.
   - **Service**: implementar CRUD estándar (según la plantilla de la sección de servicios).
   - **Controller**: implementar endpoints CRUD estándar + rutas anidadas si aplica.
   - **Spec**: escribir tests unitarios mockeando los modelos de Mongoose.

Para módulos con relaciones anidadas (ej: `parents/:parentId/children`):

- Mantener todo en un solo controller y service.
- Usar rutas parametrizadas con `:parentId` y validar con `ParseObjectIdPipe`.

---

## Configuración de entorno (`.env`)

| Variable             | Descripción                                | Default    |
| -------------------- | ------------------------------------------ | ---------- |
| `PORT`               | Puerto del servidor                        | `3000`     |
| `MONGODB_URI`        | URI de conexión a MongoDB                  | —          |
| `JWT_ACCESS_SECRET`  | Secreto para access tokens                 | —          |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens                | —          |
| `CORS_ORIGIN`        | Orígenes permitidos (coma separados)       | `*`        |
| `THROTTLE_TTL`       | TTL de rate limiting (segundos)            | `60000`    |
| `THROTTLE_LIMIT`     | Límite de peticiones por TTL               | `100`      |
| `SWAGGER_USER`       | Usuario básico para Swagger en producción  | `admin`    |
| `SWAGGER_PASSWORD`   | Password básico para Swagger en producción | `admin123` |
