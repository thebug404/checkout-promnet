# wc-unified-checkout

Web Component basado en Lit que encapsula el flujo de CyberSource Unified Checkout Client-Side Set Up.

Permite:

- Cargar dinámicamente la librería `SecureAcceptance.js`.
- Inicializar Accept y Unified Payments.
- Renderizar botones y pantalla de pago en contenedores light DOM.
- Emitir eventos para integrarte con cualquier framework (Vanilla, React, Angular, Vue, etc.).

## Tabla de contenido

- [Qué resuelve](#qué-resuelve)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Uso rápido](#uso-rápido)
- [API del componente](#api-del-componente)
- [Eventos](#eventos)
- [Métodos](#métodos)
- [Custom Properties CSS](#custom-properties-css)
- [Parts y slots](#parts-y-slots)
- [Ejemplos prácticos](#ejemplos-prácticos)
- [Flujo de integración recomendado](#flujo-de-integración-recomendado)
- [Troubleshooting](#troubleshooting)
- [Desarrollo local del paquete](#desarrollo-local-del-paquete)

## Qué resuelve

El componente unifica la inicialización del checkout y expone una API:

- Atributos declarativos para configuración.
- Eventos de ciclo de vida.
- Métodos cuando se requiere mayor precisión.

## Requisitos

- Navegador moderno con soporte para Custom Elements.
- Una sesión de backend que te devuelva:
  - capture context (JWT)
  - URL de client library
  - hash de integridad (SRI) de la librería
- Acceso al endpoint/librería de CyberSource desde el navegador.

## Instalación

### 1) En este monorepo (npm workspaces)

Desde la raíz:

```bash
npm install
```

Después, en cualquier app del monorepo, importa el paquete:

```js
import 'wc-unified-checkout';
```

En este repo ya se usa como dependencia de workspace en apps/frontend con la versión "*".

### 2) Como dependencia de un proyecto externo

Si el paquete se publica en un registro:

```bash
npm install wc-unified-checkout
```

Y luego:

```js
import 'wc-unified-checkout';
```

Nota: actualmente el paquete está marcado como private en su package.json, pensado para uso interno del monorepo.

### 3) Instalación por ruta local (sin publicar)

```bash
npm install ../ruta/a/packages/wc-unified-checkout
```

## Uso rápido

```html
<unified-checkout
  capture-context="TU_CAPTURE_CONTEXT"
  client-library="https://testup.cybersource.com/uc/v1/assets/0.19.5/SecureAcceptance.js"
  client-library-integrity="sha256-..."
  mode="embedded"
  auto-launch
></unified-checkout>

<script type="module">
  import 'wc-unified-checkout';

  const el = document.querySelector('unified-checkout');

  el.addEventListener('checkout-complete', (e) => {
    console.log('Token:', e.detail.transientToken);
  });

  el.addEventListener('checkout-error', (e) => {
    console.error('Checkout error:', e.detail);
  });
</script>
```

## API del componente

Etiqueta:

```html
<unified-checkout></unified-checkout>
```

### Atributos y propiedades

| Atributo | Propiedad | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|---|
| `capture-context` | captureContext | `string` | "" | Sí | JWT de capture context emitido por backend. |
| `client-library` | clientLibrary | `string` | "" | Sí | URL de SecureAcceptance.js. |
| `client-library-integrity` | clientLibraryIntegrity | `string` | "" | Recomendado | Hash SRI para la librería remota. |
| `mode` | mode | `embedded\|sidebar` | embedded | No | Modo de visualización. |
| `auto-complete` | autoComplete | `boolean` | false | No | Si está activo, llama up.complete(tt) automáticamente. |
| `auto-launch` | autoLaunch | `boolean` | true | No | Si está activo, inicia launch cuando los atributos requeridos están presentes. |

## Eventos

Todos los eventos son bubbling + composed (cruzan shadow DOM y se pueden escuchar desde ancestros).

| Evento | Cuándo ocurre | detail |
|---|---|---|
| checkout-loading | Al iniciar launch | undefined |
| checkout-ready | Después de crear unifiedPayments | { unifiedPayments } |
| checkout-complete | Cuando up.show resuelve (y opcionalmente complete) | { transientToken, completeResponse? } |
| checkout-error | Cuando falla script/SDK/show/complete | { error, reason?, message? } |

Ejemplo de listeners:

```js
el.addEventListener('checkout-loading', () => {
  console.log('Loading...');
});

el.addEventListener('checkout-ready', (e) => {
  console.log('SDK listo:', e.detail.unifiedPayments);
});

el.addEventListener('checkout-complete', (e) => {
  console.log('Transient token:', e.detail.transientToken);
  console.log('Complete response:', e.detail.completeResponse);
});

el.addEventListener('checkout-error', (e) => {
  console.error(e.detail.reason, e.detail.message, e.detail.error);
});
```

## Métodos

Puedes invocarlos por referencia DOM del elemento:

```js
const el = document.querySelector('unified-checkout');
```

| Método | Firma | Descripción |
|---|---|---|
| launch | () => Promise<void> | Reinicia e inicia todo el flujo de checkout. |
| hide | () => Promise<void> | Oculta la lista de métodos de pago mediante up.hide(). |
| reset | () => void | Hace teardown interno, limpia contenedores y reinicia estado. |

Ejemplo:

```js
await el.launch();
await el.hide();
el.reset();
```

## Custom Properties CSS

Puedes personalizar estilos desde afuera del componente:

| Variable | Default | Efecto |
|---|---|---|
| `--uc-min-height` | auto | Alto mínimo del host. |
| `--uc-border-radius` | 8px | Radio de borde del host. |
| `--uc-bg` | #fff | Fondo del host. |
| `--uc-spinner-color` | #3f51b5 | Color principal del spinner. |
| `--uc-spinner-size` | 40px | Tamaño del spinner. |
| `--uc-button-gap` | 8px | Separación entre botones de pago. |
| `--uc-payment-screen-margin-top` | 16px | Margen superior de la pantalla de pago. |

Ejemplo:

```css
unified-checkout {
  --uc-min-height: 420px;
  --uc-border-radius: 12px;
  --uc-bg: #f8fafc;
  --uc-spinner-color: #0f766e;
  --uc-spinner-size: 48px;
  --uc-button-gap: 12px;
  --uc-payment-screen-margin-top: 20px;
}
```

## Parts y slots

### Parts disponibles

- error
- loading
- spinner

Ejemplo:

```css
unified-checkout::part(error) {
  border: 1px solid #fecaca;
}
```

### Slots

- slot name="loading-text": reemplaza el texto de carga.
- slot default: el componente lo usa para mantener contenedores en light DOM.

Ejemplo:

```html
<unified-checkout ...>
  <span slot="loading-text">Preparando opciones de pago...</span>
</unified-checkout>
```

## Ejemplos prácticos

### 1) HTML + JS simple (auto-launch activado)

```html
<unified-checkout
  id="checkout"
  capture-context="JWT_AQUI"
  client-library="https://testup.cybersource.com/uc/v1/assets/0.19.5/SecureAcceptance.js"
  client-library-integrity="sha256-..."
  auto-launch
></unified-checkout>

<script type="module">
  import 'wc-unified-checkout';

  const checkout = document.getElementById('checkout');
  checkout.addEventListener('checkout-complete', (e) => {
    // Envía el transientToken a tu backend para autorización/captura
    fetch('/api/payments/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transientToken: e.detail.transientToken }),
    });
  });
</script>
```

### 2) Flujo manual (auto-launch y auto-complete desactivados)

```html
<unified-checkout
  id="checkout-manual"
  capture-context="JWT_AQUI"
  client-library="https://testup.cybersource.com/uc/v1/assets/0.19.5/SecureAcceptance.js"
  mode="embedded"
></unified-checkout>

<button id="start">Iniciar checkout</button>

<script type="module">
  import 'wc-unified-checkout';

  const el = document.getElementById('checkout-manual');
  el.autoLaunch = false;
  el.autoComplete = false;

  let upRef;
  el.addEventListener('checkout-ready', (e) => {
    upRef = e.detail.unifiedPayments;
  });

  el.addEventListener('checkout-complete', async (e) => {
    const tt = e.detail.transientToken;
    // Completa manualmente cuando quieras
    const completeResponse = await upRef.complete(tt);
    console.log('Manual complete:', completeResponse);
  });

  document.getElementById('start').addEventListener('click', async () => {
    await el.launch();
  });
</script>
```

### 3) Integración React

```jsx
import { useEffect, useRef } from 'react';
import 'wc-unified-checkout';

export default function CheckoutWC({ captureContext, clientLibrary, integrity }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onComplete = (e) => {
      console.log('token', e.detail.transientToken);
    };
    const onError = (e) => {
      console.error(e.detail);
    };

    el.addEventListener('checkout-complete', onComplete);
    el.addEventListener('checkout-error', onError);

    return () => {
      el.removeEventListener('checkout-complete', onComplete);
      el.removeEventListener('checkout-error', onError);
    };
  }, []);

  return (
    <unified-checkout
      ref={ref}
      capture-context={captureContext}
      client-library={clientLibrary}
      client-library-integrity={integrity || ''}
      mode="embedded"
      auto-launch
    />
  );
}
```

### 4) Modo sidebar

```html
<unified-checkout
  capture-context="JWT_AQUI"
  client-library="https://testup.cybersource.com/uc/v1/assets/0.19.5/SecureAcceptance.js"
  mode="sidebar"
  auto-launch
></unified-checkout>
```

## Flujo de integración recomendado

1. Tu frontend solicita al backend una sesión de checkout.
2. El backend genera capture context con CyberSource y responde:
   - captureContext
   - clientLibrary
   - clientLibraryIntegrity
3. El frontend setea atributos del componente.
4. El componente dispara checkout-complete con transientToken.
5. Tu backend consume transientToken para procesar el pago en servidor.

## Desarrollo local del paquete

En la carpeta packages/wc-unified-checkout:

```bash
npm install
npm run dev
npm run build
npm run preview
```
