## 1. Diagrama de componentes

Esta es la arquitectura general del sistema: cómo se organiza PUC internamente y cómo se relaciona con los sistemas externos.

![Diagrama de componentes](/assets/puc_component_diagram.svg)

## 2. Diagrama de flujo

Cómo se comporta PUC desde que un portal cliente inicia el proceso hasta que recibe el resultado vía callback, cubriendo tanto el modo embedded (iframe) como el de redirección

![Diagrama de flujo](/assets/puc_flow_diagram.svg)

## 3. Diagrama de secuencia

Este diagrama muestra la interacción temporal precisa entre todos los actores, incluyendo el retry del webhook y el flujo de verificación 3DS si aplica.

![Diagrama de secuencia](/assets/puc_sequence_diagram.svg)

Aquí un resumen de las decisiones de arquitectura que reflejan los diagramas:

**Desacoplamiento total de portales.** Cada portal existente solo necesita implementar una llamada `POST /v1/sessions` con sus parámetros de pago. PUC se encarga del resto, incluyendo el branding configurable por merchant.

**Dos modos de integración.** Embed vía iframe (para portales web que quieren experiencia inline, como Stripe Elements) y redirect (para apps móviles o portales donde el contexto completo es más adecuado, como Stripe Checkout). El portal no necesita saber cuál usa internamente Visa UC.

**Connector Adapter Pattern.** Visa Unified Checkout es solo el primer adaptador. La capa de Quarkus abstrae la comunicación con cualquier PSP futuro sin que los portales cliente cambien su integración.

**Callback estilo Stripe.** El `callback_url` se registra en la sesión inicial. PUC hace un `POST` con el resultado firmado (HMAC) y reintenta con backoff exponencial si no recibe `200 OK`, eliminando el polling en los portales.

**3DS transparente.** El flujo de challenge 3DS ocurre dentro de PUC UI, completamente invisible para los portales cliente. El portal solo recibe el resultado final aprobado o declinado.