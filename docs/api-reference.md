# PUC API — Documentación de Endpoints

**Base URL:** `http://localhost:3000`

## Autenticación

Todos los endpoints bajo `/v1/*` requieren un API Key en el header `Authorization`:

```
Authorization: Bearer puc_live_<prefix8>_<secret>
```

El API Key determina:
- **Merchant** al que pertenece la request
- **Rol y permisos** que controlan el acceso a los recursos
- **Orígenes permitidos** (validados contra el header `Origin`)
- **IPs en whitelist** (si están configuradas)

---

## Health Check

### `GET /health`

Sin autenticación. Verifica que la API está corriendo.

**Response** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-03-24T17:46:04.916Z"
}
```

---

## Sessions

### `POST /v1/sessions`

Crea una nueva sesión de pago con Cybersource Unified Checkout.

**Permiso requerido:** `sessions:create`

**Headers:**
| Header | Tipo | Requerido | Descripción |
|---|---|---|---|
| `Authorization` | string | Sí | `Bearer <api_key>` |
| `Content-Type` | string | Sí | `application/json` |

**Body:**
```json
{
  "targetOrigins": ["https://localhost:8181"],
  "clientVersion": "0.34",
  "allowedCardNetworks": ["VISA", "MASTERCARD", "AMEX"],
  "allowedPaymentTypes": ["PANENTRY", "GOOGLEPAY", "APPLEPAY"],
  "country": "US",
  "locale": "en_US",
  "captureMandate": {
    "billingType": "FULL",
    "requestEmail": true,
    "requestPhone": true,
    "requestShipping": true,
    "shipToCountries": ["US", "GB"],
    "showAcceptedNetworkIcons": true
  },
  "completeMandate": {
    "type": "PREFER_AUTH",
    "decisionManager": true,
    "consumerAuthentication": true
  },
  "data": {
    "orderInformation": {
      "amountDetails": {
        "totalAmount": "21.00",
        "currency": "USD"
      }
    }
  },
  "callback_url": "https://mi-portal.com/webhook/payment"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `targetOrigins` | string[] | Sí | URLs donde se cargará el checkout (iframe) |
| `clientVersion` | string | No | Versión del cliente UC. Default: `0.34` |
| `allowedCardNetworks` | string[] | No | Redes de tarjeta. Valores: `VISA`, `MASTERCARD`, `AMEX`, `DISCOVER`, `JCB`, `DINERSCLUB` |
| `allowedPaymentTypes` | string[] | No | Tipos de pago. Valores: `APPLEPAY`, `CHECK`, `CLICKTOPAY`, `GOOGLEPAY`, `PANENTRY`, `PAZE` |
| `country` | string | No | Código de país ISO. Default: `US` |
| `locale` | string | No | Locale. Default: `en_US` |
| `captureMandate` | object | No | Configuración de captura de datos de billing/shipping |
| `completeMandate` | object | No | Configuración de completar la transacción |
| `data.orderInformation` | object | Sí | Información de la orden (monto, currency, billing, shipping) |
| `orderInformation` | object | Sí* | Alternativa a `data.orderInformation` |
| `callback_url` | string | No | URL para recibir webhook con resultado del pago (firmado con HMAC) |

**Response** `201 Created`
```json
{
  "data": {
    "id": "69c0e032-e7b8-4493-98bd-d6a6abf13885",
    "capture_context": "eyJraWQiOiJ6dSIsImFsZyI6IlJTMjU2In0.eyJmbHgiOns...",
    "client_library": "https://testflex.cybersource.com/microform/bundle/v2.0/flex-microform.min.js",
    "client_library_integrity": "sha384-...",
    "status": "CREATED",
    "payment_payload": { ... },
    "expires_at": "2026-03-24T18:16:19.663Z",
    "created_at": "2026-03-24T17:46:19.663Z"
  }
}
```

El `capture_context` es un JWT que contiene la sesión de CyberSource Unified Checkout. Se usa para inicializar el SDK de UC en el frontend. El `client_library` es la URL del SDK JavaScript que el portal debe cargar.

**Errores:**
| Código | Descripción |
|---|---|
| `400` | Validación fallida (campos faltantes o inválidos) |
| `401` | API Key inválida o faltante |
| `403` | Sin permiso, key revocada, expirada, o IP/origin no permitido |
| `422` | Merchant sin credenciales CyberSource activas |
| `502` | Error al comunicarse con CyberSource API |

---

### `GET /v1/sessions`

Lista todas las sesiones del merchant autenticado.

**Permiso requerido:** `sessions:read`

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "69c0e032-...",
      "status": "CREATED",
      "expires_at": "2026-03-24T18:16:19.663Z",
      "created_at": "2026-03-24T17:46:19.663Z"
    }
  ]
}
```

---

### `GET /v1/sessions/:id`

Obtiene el detalle de una sesión por su ID.

**Permiso requerido:** `sessions:read`

**Response** `200 OK`
```json
{
  "data": {
    "id": "69c0e032-...",
    "capture_context": "eyJraWQiOiJ6dSIs...",
    "status": "CREATED",
    "payment_payload": { ... },
    "callback_url": "https://mi-portal.com/webhook/payment",
    "expires_at": "2026-03-24T18:16:19.663Z",
    "created_at": "2026-03-24T17:46:19.663Z"
  }
}
```

---

### `POST /v1/sessions/:id/payment`

Procesa el pago usando el transient token devuelto por Unified Checkout después de que el usuario completa el formulario. Llama a la API de pagos de CyberSource.

**Permiso requerido:** `sessions:create`

**Body:**
```json
{
  "transientToken": "eyJraWQiOiIwOE...",
  "referenceCode": "ORDER-12345"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `transientToken` | string | Sí | JWT transient token devuelto por UC SDK al completar checkout |
| `referenceCode` | string | No | Código de referencia para la transacción |

**Response** `200 OK`
```json
{
  "data": {
    "session_id": "69c0e032-...",
    "status": "COMPLETED",
    "cybersource_payment_id": "7012345678901234567890",
    "cybersource_status": "AUTHORIZED",
    "reconciliation_id": "ABC123DEF456"
  }
}
```

**Errores:**
| Código | Descripción |
|---|---|
| `400` | transientToken faltante |
| `404` | Sesión no encontrada |
| `409` | Sesión ya procesada |
| `422` | Sin credenciales CyberSource |
| `502` | Error al procesar pago en CyberSource |

---

### `POST /v1/sessions/:id/complete`

Actualiza manualmente el estado de una sesión (para testing/admin). Envía webhook si hay `callback_url`.

**Permiso requerido:** `sessions:create`

**Body:**
```json
{
  "status": "COMPLETED"
}
```

| Campo | Tipo | Valores | Descripción |
|---|---|---|---|
| `status` | string | `COMPLETED`, `DECLINED` | Resultado del pago |

**Response** `200 OK`
```json
{
  "data": {
    "id": "69c0e032-...",
    "status": "COMPLETED",
    "completed_at": "2026-03-24T18:00:00.000Z"
  }
}
```

**Errores:**
| Código | Descripción |
|---|---|
| `404` | Sesión no encontrada |
| `409` | Sesión ya no está en estado `CREATED` |

---

## Merchants

### `GET /v1/merchants`

Lista todos los merchants.

**Permiso requerido:** `merchants:read`

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "4dee6a02-...",
      "name": "Acme Corp",
      "ruc": "20100100100",
      "country_code": "PE",
      "status": "active",
      "created_at": "2026-03-24T17:45:16.917Z"
    }
  ]
}
```

---

### `GET /v1/merchants/:id`

Obtiene un merchant por ID.

**Permiso requerido:** `merchants:read`

---

### `POST /v1/merchants`

Crea un nuevo merchant.

**Permiso requerido:** `merchants:create`

**Body:**
```json
{
  "name": "NuevoComercio",
  "ruc": "20300300300",
  "country_code": "CO"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `name` | string | Sí | Nombre del comercio |
| `ruc` | string | Sí | Identificador fiscal (RUC/NIT) |
| `country_code` | string | Sí | Código ISO del país |

**Response** `201 Created`

**Errores:**
| Código | Descripción |
|---|---|
| `400` | Campos requeridos faltantes |
| `409` | RUC ya existe |

---

### `PATCH /v1/merchants/:id`

Actualiza un merchant.

**Permiso requerido:** `merchants:update`

**Body (todos opcionales):**
```json
{
  "name": "Nuevo Nombre",
  "status": "inactive"
}
```

---

### `DELETE /v1/merchants/:id`

Desactiva un merchant (soft delete).

**Permiso requerido:** `merchants:delete`

**Response** `200 OK`
```json
{
  "message": "Merchant deactivated"
}
```

---

## API Keys

### `GET /v1/api-keys`

Lista los API keys del merchant autenticado. No expone el hash.

**Permiso requerido:** `api_keys:read`

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "abc-123-...",
      "merchant_id": "4dee6a02-...",
      "role_id": "14f9a0d5-...",
      "key_prefix": "a9bef037",
      "allowed_origins": ["https://localhost:8181"],
      "ip_whitelist": [],
      "is_active": true,
      "expires_at": "2027-03-24T...",
      "last_used_at": "2026-03-24T...",
      "created_at": "2026-03-24T...",
      "created_by": "system"
    }
  ]
}
```

---

### `GET /v1/api-keys/:id`

Obtiene un API key por ID.

**Permiso requerido:** `api_keys:read`

---

### `POST /v1/api-keys`

Crea un nuevo API key. **El key raw solo se muestra una vez.**

**Permiso requerido:** `api_keys:create`

**Body:**
```json
{
  "role_id": "14f9a0d5-...",
  "allowed_origins": ["https://mitienda.com"],
  "ip_whitelist": ["203.0.113.50"],
  "expires_at": "2027-12-31T23:59:59.000Z",
  "created_by": "admin@acme.com"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `role_id` | string (UUID) | Sí | ID del rol a asignar |
| `allowed_origins` | string[] | No | Orígenes HTTP permitidos |
| `ip_whitelist` | string[] | No | IPs permitidas |
| `expires_at` | string (ISO) | No | Fecha de expiración. Default: 1 año |
| `created_by` | string | No | Quién creó la key |

**Response** `201 Created`
```json
{
  "data": { ... },
  "key": "puc_live_ab12cd34_ef567890...",
  "warning": "Store this key securely. It cannot be retrieved again."
}
```

---

### `PATCH /v1/api-keys/:id`

Actualiza configuración de un API key (orígenes, IPs, expiración).

**Permiso requerido:** `api_keys:create`

**Body (todos opcionales):**
```json
{
  "allowed_origins": ["https://nueva-url.com"],
  "ip_whitelist": ["10.0.0.1"],
  "expires_at": "2028-01-01T00:00:00.000Z"
}
```

---

### `POST /v1/api-keys/:id/revoke`

Revoca un API key (lo desactiva permanentemente).

**Permiso requerido:** `api_keys:revoke`

**Response** `200 OK`
```json
{
  "message": "API key revoked"
}
```

---

## Roles y Permisos

### `GET /v1/roles`

Lista todos los roles disponibles.

**Permiso requerido:** `merchants:read`

**Response** `200 OK`
```json
{
  "data": [
    { "id": "...", "name": "admin", "description": "Full access to all resources" },
    { "id": "...", "name": "session_creator", "description": "Can create and read payment sessions" },
    { "id": "...", "name": "readonly", "description": "Read-only access to resources" }
  ]
}
```

---

### `GET /v1/roles/:id`

Obtiene un rol con sus permisos resueltos.

**Response** `200 OK`
```json
{
  "data": {
    "id": "...",
    "name": "admin",
    "description": "Full access to all resources",
    "permissions": [
      { "id": "...", "resource": "sessions", "action": "create" },
      { "id": "...", "resource": "sessions", "action": "read" }
    ]
  }
}
```

---

### `GET /v1/roles/permissions/all`

Lista todos los permisos disponibles en el sistema.

---

## PSP Credentials

### `GET /v1/psp-credentials`

Lista las credenciales PSP del merchant autenticado. Los secret keys se muestran enmascarados.

**Permiso requerido:** `psp_credentials:read`

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "...",
      "merchant_id": "...",
      "psp_name": "cybersource",
      "credential_ref": null,
      "cybersource_merchant_id": "your_merchant_id",
      "cybersource_key_id": "your_key_id",
      "cybersource_secret_key": "***",
      "is_active": true,
      "created_at": "2026-03-24T..."
    }
  ]
}
```

---

### `POST /v1/psp-credentials`

Registra una nueva credencial PSP para el merchant.

**Permiso requerido:** `psp_credentials:create`

**Body (CyberSource):**
```json
{
  "psp_name": "cybersource",
  "cybersource_merchant_id": "your_cybersource_merchant_id",
  "cybersource_key_id": "your_http_signature_key_id",
  "cybersource_secret_key": "your_http_signature_secret_key"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `psp_name` | string | Sí | Nombre del PSP (`cybersource`) |
| `cybersource_merchant_id` | string | Sí* | Merchant ID de CyberSource |
| `cybersource_key_id` | string | Sí* | Key ID para HTTP Signature auth |
| `cybersource_secret_key` | string | Sí* | Secret Key para HTTP Signature auth |

\* Requeridos cuando `psp_name` es `cybersource`. Se obtienen del [EBC Portal de CyberSource](https://ebc2test.cybersource.com/).

---

### `PATCH /v1/psp-credentials/:id`

Actualiza una credencial PSP.

**Permiso requerido:** `psp_credentials:update`

**Body (todos opcionales):**
```json
{
  "cybersource_merchant_id": "new_merchant_id",
  "cybersource_key_id": "new_key_id",
  "cybersource_secret_key": "new_secret_key",
  "is_active": false
}
```

---

## Audit Logs

### `GET /v1/audit-logs`

Lista los logs de auditoría del merchant autenticado. Paginado.

**Permiso requerido:** `audit_logs:read`

**Query params:**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | `1` | Número de página |
| `limit` | number | `50` | Items por página (máx 100) |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "...",
      "api_key_id": "...",
      "event_type": "POST /v1/sessions",
      "ip_address": "unknown",
      "endpoint": "/v1/sessions",
      "http_status": 201,
      "created_at": "2026-03-24T..."
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

---

## Códigos de Error Comunes

| Código | Descripción |
|---|---|
| `400` | Request inválida (JSON malformado, campos faltantes) |
| `401` | API Key faltante, inválida, o con formato incorrecto |
| `403` | Sin permiso, key revocada, expirada, IP/origin bloqueado, merchant inactivo |
| `404` | Recurso no encontrado |
| `409` | Conflicto (duplicado o estado incompatible) |
| `422` | Error de negocio (ej: sin credenciales PSP) |
| `500` | Error interno del servidor |

Todas las respuestas de error siguen el formato:
```json
{
  "error": "Descripción del error",
  "details": ["Detalle 1", "Detalle 2"]
}
```
