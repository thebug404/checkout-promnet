Muy buena pregunta — el diseño de API Keys es crítico para seguridad y operación. Déjame modelarlo completo.Perfecto. Voy a modelar esto en tres capas: el modelo de datos (ERD), la jerarquía de roles/permisos, y el flujo de validación de una API Key en runtime.

## 1. Modelo de datos — ERD completo

Este es el corazón del sistema. Nota cómo `merchant_psp_credential` desacopla las credenciales de Cybersource/Visa del `api_key` del portal cliente — son dos identidades distintas con ciclos de vida independientes.

<iframe src="/assets/puc_apikey_erd.html" width="100%" height="600px" frameborder="0"></iframe>

## 2. Jerarquía de roles y permisos

El sistema de roles sigue un modelo RBAC. Cada `api_key` tiene exactamente un rol, y cada rol agrupa un conjunto de permisos sobre recursos específicos de PUC.

![Jerarquía de Roles y Permisos](/assets/puc_roles_permissions.svg)

## 3. Flujo de validación en runtime

Este es el proceso que ejecuta el `AuthFilter` de Quarkus cada vez que llega una request con una API Key. Nota el punto crítico donde se inyectan las credenciales PSP — el portal cliente nunca las ve.

![Flujo de Validación de API Key](/assets/puc_apikey_validation_flow.svg)

Aquí están las consideraciones de diseño clave que fundamentan todo el modelo:

**Anatomía de la API Key.** El formato `puc_live_<prefix8>_<secret52>` tiene tres partes con propósitos distintos: el prefijo de entorno (`puc_live_` / `puc_sandbox_`) permite saber inmediatamente en qué ambiente opera sin parsear nada; el `prefix8` es los primeros 8 caracteres del secreto, almacenados en texto plano para hacer el lookup en base de datos sin iterar toda la tabla; y el `secret52` se hashea con Argon2id y nunca se guarda en claro — ni en logs, ni en base de datos.

**Las credenciales Cybersource/Visa son completamente separadas.** La tabla `merchant_psp_credential` almacena referencias a un vault (HashiCorp Vault o AWS Secrets Manager) — no el valor directo. Cuando una request pasa la validación, el `AuthFilter` resuelve esas referencias e inyecta las credenciales en el contexto de ejecución del `ConnectorAdapter`. El portal cliente que generó la API Key nunca tiene visibilidad sobre qué credenciales PSP se están usando, ni sobre su rotación.

**Dos identidades, dos ciclos de vida.** Una API Key puede revocarse, rotarse o expirar sin afectar las credenciales PSP del merchant, y viceversa. Esto es fundamental: si Visa rota sus credenciales o cambia un contrato, solo se actualiza `merchant_psp_credential` — todos los portales integrados siguen funcionando sin cambios.
**Cache de validación.** Redis almacena el resultado de validación (hash + rol + permisos resueltos) con un TTL de 5 minutos por prefix. Esto evita una consulta a PostgreSQL en cada request, que en un checkout de alta concurrencia puede ser determinante.