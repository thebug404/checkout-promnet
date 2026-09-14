# checkout-promnet

Monorepo (npm workspaces + Turborepo) para generar y procesar sesiones de pago con **Cybersource Unified Checkout** bajo el modelo *Merchant of Record*.

## Tabla de contenido

- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [1. Instalar dependencias](#1-instalar-dependencias)
- [2. Configurar variables de entorno](#2-configurar-variables-de-entorno)
- [3. Levantar la infraestructura (Postgres + Keycloak)](#3-levantar-la-infraestructura-postgres--keycloak)
- [4. Configurar Keycloak](#4-configurar-keycloak)
- [5. Compilar los paquetes compartidos](#5-compilar-los-paquetes-compartidos)
- [6. Levantar los servicios de `apps/`](#6-levantar-los-servicios-de-apps)
  - [apps/api](#appsapi--puc-api)
  - [apps/web](#appsweb--panel-de-administración)
  - [apps/frontend](#appsfrontend--demo-de-checkout)
  - [apps/propay-api](#appspropay-api--adaptador-para-payment-links)
- [7. Flujo de prueba end-to-end](#7-flujo-de-prueba-end-to-end)
- [Levantar todo con Docker (opcional)](#levantar-todo-con-docker-opcional)
- [Comandos útiles](#comandos-útiles)
- [Solución de problemas](#solución-de-problemas)
- [Documentación adicional](#documentación-adicional)

---

## Estructura del proyecto

```
checkout-promnet/
├── apps/
│   ├── api/            # PUC API (Hono + TypeORM + Postgres + Keycloak + Cybersource)  → :3000
│   ├── web/            # Panel de administración (React Router v7 SSR + Keycloak)      → :5173
│   ├── frontend/       # Demo de checkout (React + Vite + <unified-checkout>)          → :5174 (HTTPS)
│   └── propay-api/     # Adaptador para payment links que consume la PUC API (Hono)    → :3001
├── packages/
│   ├── ui/                    # Componentes UI compartidos (shadcn/Tailwind) usados por apps/web
│   ├── remix-auth-keycloak/   # Estrategia Keycloak para remix-auth usada por apps/web
│   └── wc-unified-checkout/   # Web Component <unified-checkout> (Lit) usado por apps/frontend
├── keycloak/           # Export del realm `checkout-promnet` (se importa automáticamente)
├── docs/               # Referencia de endpoints, diagramas y documentación de Cybersource
├── docker-compose.yml  # Postgres 16 + Keycloak 26 (api/web/frontend están comentados)
└── turbo.json          # Pipeline de tareas (dev, build, check-types)
```

## Requisitos previos

| Herramienta        | Versión recomendada                          |
| ------------------ | -------------------------------------------- |
| Node.js            | 20 o superior (los Dockerfiles usan Node 20) |
| npm                | 11.x (`packageManager: npm@11.8.0`)          |
| Docker + Compose   | Cualquier versión reciente                   |
| Cuenta Cybersource | Credenciales de sandbox (`apitest.cybersource.com`): Merchant ID, Key ID y Secret Key |

---

## 1. Instalar dependencias

Todo se instala desde la raíz del monorepo (npm workspaces):

```bash
npm install
```

## 2. Configurar variables de entorno

Cada archivo `.env` tiene su `.env.example` como plantilla. Copia y ajusta los siguientes:

### Raíz (`.env`) — usado por `docker-compose.yml`

```bash
cp .env.example .env
```

```env
NODE_ENV="development"

DB_HOST="localhost"
DB_PORT="5432"
DB_USERNAME="postgres"
DB_PASSWORD="postgres"
DB_NAME="checkout_promnet"

KC_BOOTSTRAP_ADMIN_USERNAME="admin"
KC_BOOTSTRAP_ADMIN_PASSWORD="admin"

KEYCLOAK_CLIENT_SECRET="your-client-secret"
```

### `apps/api/.env`

```bash
cp apps/api/.env.example apps/api/.env
```

```env
NODE_ENV="development"

# Keycloak (validación de JWT del panel admin)
KEYCLOAK_BASE_URL="http://localhost:8080"
KEYCLOAK_REALM="checkout-promnet"
KEYCLOAK_CLIENT_ID="web-admin"
KEYCLOAK_CLIENT_SECRET="your-client-secret"

# Credenciales de Cybersource usadas por el seed inicial (opcional).
# Si no se definen, el seed crea credenciales con valores placeholder que
# luego puedes editar desde el panel admin (PSP Credentials).
CYBERSOURCE_MERCHANT_ID=""
CYBERSOURCE_KEY_ID=""
CYBERSOURCE_SECRET_KEY=""
```

> Las variables de base de datos (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`) son opcionales: por defecto apuntan a `localhost:5432` / `postgres` / `postgres` / `checkout_promnet`, que coincide con lo que levanta `docker-compose.yml`.

### `apps/web/.env`

```bash
cp apps/web/.env.example apps/web/.env
```

```env
API_BASE_URL="http://localhost:3000"
APP_URL="http://localhost:5173"

KEYCLOAK_BASE_URL="http://localhost:8080"
KEYCLOAK_REALM="checkout-promnet"
KEYCLOAK_CLIENT_ID="web-admin"
KEYCLOAK_CLIENT_SECRET="your-client-secret"
SESSION_SECRET="s3cr3t-d3v-0nly-ch4ng3-1n-pr0d"
```

### `apps/propay-api/.env`

No tiene `.env.example`; crea el archivo con este contenido:

```env
NODE_ENV=development
BASE_URL_CHECKOUT_API="http://localhost:3000"

# Merchant y API Key generados por el seed de apps/api (ver paso 6)
CHECKOUT_MERCHANT_ID=""
CHECKOUT_API_KEY=""

# Orígenes desde donde se renderiza el checkout (separados por coma)
UNIFIED_CHECKOUT_TARGET_ORIGINS="https://localhost:5175"

# Opcionales (valores por defecto)
# UNIFIED_CHECKOUT_CLIENT_VERSION="0.19"
# UNIFIED_CHECKOUT_COUNTRY="SV"
# UNIFIED_CHECKOUT_LOCALE="es_SV"
```

### `apps/frontend`

No requiere `.env`. La API Key y el Merchant ID se ingresan desde la propia UI.

## 3. Levantar la infraestructura (Postgres + Keycloak)

```bash
docker compose up -d
```

Esto levanta:

| Servicio | Imagen                         | Puerto | Notas                                                        |
| -------- | ------------------------------ | ------ | ------------------------------------------------------------ |
| postgres | `postgres:16-alpine`           | 5432   | BD `checkout_promnet`, datos persistidos en volumen `postgres-data` |
| keycloak | `quay.io/keycloak/keycloak:26.5.7` | 8080 | Modo `start-dev`, importa el realm desde `./keycloak/` al arrancar |

Verifica que ambos estén `healthy` antes de continuar (Keycloak tarda ~40 s):

```bash
docker compose ps
```

## 4. Configurar Keycloak

El realm `checkout-promnet` se importa automáticamente con dos clientes: `checkout-promnet-api` y `web-admin`. Solo falta:

1. Entrar a la consola de administración: <http://localhost:8080> (usuario/contraseña: `admin` / `admin`, o lo que definiste en `KC_BOOTSTRAP_ADMIN_*`).
2. Cambiar al realm **checkout-promnet** (selector arriba a la izquierda).
3. **Obtener el client secret**: `Clients` → `web-admin` → pestaña `Credentials` → copiar `Client Secret`. Pégalo en `KEYCLOAK_CLIENT_SECRET` de `apps/api/.env`, `apps/web/.env` y `.env` de la raíz.
4. **Crear un usuario** para entrar al panel admin: `Users` → `Add user` → completar username/email → `Create`. Luego en la pestaña `Credentials` → `Set password` (desmarca *Temporary*).

## 5. Compilar los paquetes compartidos

`apps/frontend` consume `wc-unified-checkout` desde su carpeta `dist/`, por lo que debe compilarse al menos una vez:

```bash
npm run build:packages
```

(`packages/ui` y `packages/remix-auth-keycloak` se consumen directamente desde `src/`, no requieren build).

## 6. Levantar los servicios de `apps/`

### Opción A: todos a la vez con Turborepo

```bash
npm run dev:apps
```

> Levanta `api`, `web`, `frontend` y `propay-api` en paralelo. Ten en cuenta que `api` necesita Postgres y Keycloak ya arriba (paso 3), de lo contrario fallará al iniciar.

### Opción B: uno por uno (recomendado la primera vez)

Levántalos en este orden, cada uno en su propia terminal:

```bash
npm run dev --workspace=apps/api          # 1º — necesita Postgres + Keycloak
npm run dev --workspace=apps/web          # 2º — necesita api + Keycloak
npm run dev --workspace=apps/frontend     # 3º — necesita api
npm run dev --workspace=apps/propay-api   # 4º — necesita api + una API Key
```

A continuación el detalle de cada servicio.

---

### `apps/api` — PUC API

API RESTful (Hono) que gestiona merchants, API keys, roles/permisos, credenciales PSP, sesiones de Unified Checkout y audit logs. Persiste en Postgres vía TypeORM.

| Item        | Valor                                                   |
| ----------- | ------------------------------------------------------- |
| Puerto      | `3000`                                                  |
| Health      | <http://localhost:3000/health>                          |
| Base path   | `/v1/*` (requiere `Authorization: Bearer <token>`)      |
| Autenticación | API Key (`puc_live_...`) **o** JWT de Keycloak (panel admin) |
| Dependencias | Postgres, Keycloak                                     |

```bash
npm run dev --workspace=apps/api     # tsx watch
npm run start --workspace=apps/api   # sin watch
npm run seed --workspace=apps/api    # ejecutar el seed manualmente
```

**Seed automático.** En `NODE_ENV=development` la API sincroniza el esquema (`synchronize: true`) y, si las tablas están vacías, inserta datos de ejemplo: permisos, roles (`admin`, `session_creator`, `readonly`), dos merchants (`Acme Corp`, `MegaStore Inc`), una API Key `admin` por merchant y credenciales Cybersource por merchant. Las API Keys se imprimen en consola **una sola vez** (se guardan hasheadas):

```
Generated API Keys (save these, they cannot be retrieved later):

  Acme Corp: puc_live_ab68f3f6_93f399ce8dea0c1039c6bbf9b3b8e44b1ddc39d7bb5de50ba200911d
  MegaStore Inc: puc_live_6e09c2b5_3c966bb6736799e147b851ce4cc471d43cedc7d2fbe8a6ec0642d250
```

Guárdalas: las necesitarás para `apps/frontend` y `apps/propay-api`. Si las pierdes, crea una nueva desde el panel admin (`API Keys`) o borra el volumen (`docker compose down -v`) y vuelve a arrancar.

La referencia completa de endpoints está en [`docs/api-reference.md`](docs/api-reference.md).

---

### `apps/web` — Panel de administración

Aplicación React Router v7 (SSR) con login vía Keycloak (`remix-auth` + `remix-auth-keycloak`). Permite administrar merchants, API keys, credenciales PSP, sesiones, roles y audit logs consumiendo `apps/api` con el JWT del usuario.

| Item         | Valor                                  |
| ------------ | -------------------------------------- |
| Puerto       | `5173`                                 |
| URL          | <http://localhost:5173>                |
| Login        | Usuario creado en Keycloak (paso 4)    |
| Dependencias | `apps/api`, Keycloak, `packages/ui`, `packages/remix-auth-keycloak` |

```bash
npm run dev --workspace=apps/web        # react-router dev
npm run build --workspace=apps/web      # genera dist/
npm run start --workspace=apps/web      # sirve dist/ (producción)
npm run typecheck --workspace=apps/web
```

Rutas principales: `/login`, `/dashboard`, `/merchants`, `/api-keys`, `/psp-credentials`, `/sessions`, `/roles`, `/audit-logs`.

---

### `apps/frontend` — Demo de checkout

SPA React + Vite que muestra el flujo completo de Unified Checkout usando el Web Component `<unified-checkout>` de `packages/wc-unified-checkout`. Corre en **HTTPS** (certificado autofirmado vía `@vitejs/plugin-basic-ssl`) porque Cybersource lo exige.

| Item         | Valor                                                             |
| ------------ | ----------------------------------------------------------------- |
| Puerto       | `5174` (HTTPS)                                                    |
| URL          | <https://localhost:5174>                                          |
| Proxy        | `/v1/*` y `/health` → `http://localhost:3000` (configurado en `vite.config.js`) |
| Dependencias | `apps/api`, `packages/wc-unified-checkout` (compilado)            |

```bash
npm run dev --workspace=apps/frontend
npm run build --workspace=apps/frontend
npm run preview --workspace=apps/frontend
```

El navegador mostrará una advertencia por el certificado autofirmado; acéptala para continuar.

---

### `apps/propay-api` — Adaptador para payment links

API mínima (Hono) que traduce un request de *payment link* (datos del pagador, monto, moneda) al formato que espera `apps/api` y reenvía la creación de sesión y el procesamiento del pago usando un merchant y API Key fijos configurados por entorno.

| Item         | Valor                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Puerto       | `3001`                                                                    |
| Health       | <http://localhost:3001/health>                                            |
| Endpoints    | `POST /v1/payment-links/sessions`, `POST /v1/merchants/:merchantId/sessions/:sessionId/payment` |
| Dependencias | `apps/api` en ejecución + `CHECKOUT_MERCHANT_ID` y `CHECKOUT_API_KEY` válidos |

```bash
npm run dev --workspace=apps/propay-api     # tsx watch
npm run build --workspace=apps/propay-api   # tsc → dist/
npm run start --workspace=apps/propay-api   # node dist/index.js
```

Ejemplo de request:

```bash
curl -X POST http://localhost:3001/v1/payment-links/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "link_id": "LNK-001",
    "commerce_id": "COM-001",
    "terminal_id": "TRM-001",
    "amount": 21.00,
    "currency": "USD",
    "payer": {
      "first_name": "Juan",
      "last_name": "Pérez",
      "email": "juan@example.com",
      "phone": "70000000",
      "state": "San Salvador",
      "city": "San Salvador",
      "address1": "Calle 1 #123"
    }
  }'
```

---

## 7. Flujo de prueba end-to-end

1. Arranca Postgres y Keycloak (`docker compose up -d`) y luego `apps/api`. Copia las API Keys que imprime el seed.
2. Entra al panel admin <http://localhost:5173> con el usuario de Keycloak. En `Merchants` copia el **ID** del merchant que quieras usar. En `PSP Credentials` verifica/edita las credenciales de Cybersource de ese merchant (si no las pasaste por `CYBERSOURCE_*`, tendrán valores placeholder).
3. Abre la demo <https://localhost:5174>, pega la **API Key** y el **Merchant ID**, ajusta los datos de la orden y crea la sesión. Se renderizará el checkout de Cybersource; al completarlo se procesa el pago y se muestra el resultado.
4. (Opcional) Configura `CHECKOUT_MERCHANT_ID` / `CHECKOUT_API_KEY` en `apps/propay-api/.env`, arranca `propay-api` y prueba `POST /v1/payment-links/sessions`.

## Levantar todo con Docker (opcional)

`docker-compose.yml` incluye definiciones (comentadas) para `api`, `frontend` y `web`. Para correr toda la plataforma en contenedores:

1. Descomenta los servicios `api`, `frontend` y `web` en `docker-compose.yml`.
2. Asegúrate de que `.env` de la raíz tenga `KEYCLOAK_CLIENT_SECRET` (paso 4) y, si aplica, `CYBERSOURCE_*`.
3. Ejecuta:

```bash
docker compose up -d --build
```

| Servicio | Puerto(s)      | URL                              |
| -------- | -------------- | -------------------------------- |
| api      | 3000           | <http://localhost:3000>          |
| web      | 5173           | <http://localhost:5173>          |
| frontend | 80 → 5174 (HTTPS, nginx) | <https://localhost:5174> |

Para ver las API Keys generadas por el seed:

```bash
docker compose logs api
```

## Comandos útiles

```bash
# Desarrollo
npm run dev              # todos los workspaces (apps + packages)
npm run dev:apps         # solo apps/*
npm run dev:packages     # solo packages/*

# Build
npm run build            # todos los workspaces
npm run build:apps
npm run build:packages

# Infraestructura
docker compose up -d
docker compose ps
docker compose logs -f keycloak
docker compose down          # detiene contenedores (conserva la BD)
docker compose down -v       # detiene y borra el volumen de Postgres (resetea datos y seed)

# Base de datos (apps/api)
npm run seed --workspace=apps/api
npm run migration:generate --workspace=apps/api
npm run migration:run --workspace=apps/api
```

## Solución de problemas

- **`apps/api` falla al arrancar con error de Keycloak / `Issuer.discover`**: Keycloak todavía no está listo. Espera a que `docker compose ps` lo muestre `healthy` y vuelve a arrancar la API.
- **`Database connection failed`**: Postgres no está arriba o las variables `DB_*` no coinciden con `docker-compose.yml`.
- **`Origin not allowed` (403) al crear sesión desde el navegador**: la API Key valida el header `Origin`. Agrega el origen (por ejemplo `https://localhost:5174`) a `allowed_origins` de la API Key desde el panel admin (`API Keys` → editar), o déjalo vacío para no restringir.
- **Vite no resuelve `wc-unified-checkout` en `apps/frontend`** (por ejemplo `Failed to resolve entry for package "wc-unified-checkout"`): falta compilar el paquete. Ejecuta `npm run build:packages`.
- **Login del panel admin falla / redirige en bucle**: revisa que `KEYCLOAK_CLIENT_SECRET` en `apps/web/.env` sea el del cliente `web-admin` y que `APP_URL` coincida con la URL desde la que accedes (`http://localhost:5173`).
- **Quiero regenerar las API Keys del seed**: `docker compose down -v && docker compose up -d` y vuelve a arrancar `apps/api`.

## Documentación adicional

- [`docs/api-reference.md`](docs/api-reference.md) — endpoints, headers, bodies y respuestas de la PUC API.
- [`docs/diagram-checkout.md`](docs/diagram-checkout.md) — diagrama de arquitectura del flujo de checkout.
- [`docs/unified-checkout.pdf`](docs/unified-checkout.pdf) — documentación oficial de Cybersource Unified Checkout.
- [`packages/wc-unified-checkout/README.md`](packages/wc-unified-checkout/README.md) — API, eventos y ejemplos del Web Component `<unified-checkout>`.
- [`INSTRUCTIONS.md`](INSTRUCTIONS.md) — especificación original del proyecto.
