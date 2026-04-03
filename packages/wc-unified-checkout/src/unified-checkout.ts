import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DisplayMode = 'embedded' | 'sidebar';

export interface CheckoutReadyDetail {
  unifiedPayments: unknown;
}

export interface CheckoutCompleteDetail {
  transientToken: string;
  completeResponse?: unknown;
}

export interface CheckoutErrorDetail {
  error: unknown;
  reason?: string;
  message?: string;
}

// Augment global so consumers see `Accept` on window
declare global {
  interface Window {
    Accept: (captureContext: string) => Promise<AcceptInstance>;
  }
  interface AcceptInstance {
    unifiedPayments: (sidebar: boolean) => Promise<UnifiedPaymentsInstance>;
    dispose: () => void;
  }
  interface UnifiedPaymentsInstance {
    show: (args: ShowArgs) => Promise<string>;
    complete: (tt: string) => Promise<unknown>;
    hide: () => Promise<void>;
  }
  interface ShowArgs {
    containers: {
      paymentSelection?: string;
      paymentScreen?: string;
    };
  }
}

/**
 * `<unified-checkout>` — A Lit-based web component that encapsulates the
 * CyberSource Unified Checkout Client-Side Set Up flow.
 *
 * ## Usage
 * ```html
 * <unified-checkout
 *   capture-context="eyJ..."
 *   client-library="https://testup.cybersource.com/uc/v1/assets/0.19.5/SecureAcceptance.js"
 *   client-library-integrity="sha256-VOPK2eOo..."
 *   mode="embedded"
 *   auto-complete
 * ></unified-checkout>
 * ```
 *
 * ## Events
 * | Event                | Detail                               |
 * |----------------------|--------------------------------------|
 * | `checkout-ready`     | `{ unifiedPayments }`                |
 * | `checkout-complete`  | `{ transientToken, completeResponse }` |
 * | `checkout-error`     | `{ error, reason?, message? }`       |
 * | `checkout-loading`   | (no detail)                          |
 *
 * ## CSS Custom Properties
 * | Property                        | Default   |
 * |---------------------------------|-----------|
 * | `--uc-min-height`               | `400px`   |
 * | `--uc-border-radius`            | `8px`     |
 * | `--uc-bg`                       | `#fff`    |
 * | `--uc-spinner-color`            | `#3f51b5` |
 * | `--uc-spinner-size`             | `40px`    |
 * | `--uc-button-gap`               | `8px`     |
 * | `--uc-payment-screen-margin-top`| `16px`    |
 *
 * ## Methods
 * | Method     | Description                                     |
 * |------------|-------------------------------------------------|
 * | `launch()` | Programmatically starts the checkout flow.       |
 * | `reset()`  | Tears down the current instance and resets state.|
 * | `hide()`   | Hides the button list (calls `up.hide()`).       |
 */
@customElement('unified-checkout')
export class UnifiedCheckout extends LitElement {
  // ─── Reactive Properties (HTML Attributes) ────────────────────────────────

  /** The capture context JWT returned by the server. */
  @property({ type: String, attribute: 'capture-context' })
  captureContext = '';

  /** URL to the SecureAcceptance.js library (from capture context response). */
  @property({ type: String, attribute: 'client-library' })
  clientLibrary = '';

  /** SRI integrity hash for the JS library (from capture context response). */
  @property({ type: String, attribute: 'client-library-integrity' })
  clientLibraryIntegrity = '';

  /** Display mode: `embedded` (inline) or `sidebar` (overlay). */
  @property({ type: String, reflect: true })
  mode: DisplayMode = 'embedded';

  /**
   * When true, automatically calls `up.complete(tt)` after `up.show()` resolves.
   * When false, `checkout-complete` fires with just the transient token,
   * letting the consumer call `complete()` manually.
   */
  @property({ type: Boolean, attribute: 'auto-complete' })
  autoComplete = false;

  /**
   * When true, the checkout flow starts automatically as soon as all
   * required attributes (capture-context, client-library) are set.
   */
  @property({ type: Boolean, attribute: 'auto-launch' })
  autoLaunch = true;

  // ─── Internal State ───────────────────────────────────────────────────────

  @state() private _loading = false;
  @state() private _error: string | null = null;

  private _acceptInstance: AcceptInstance | null = null;
  private _upInstance: UnifiedPaymentsInstance | null = null;
  private _cancelled = false;
  private _launched = false;

  /** Unique suffix so multiple instances don't clash on IDs. */
  private _uid = Math.random().toString(36).slice(2, 8);

  // ─── Styles ───────────────────────────────────────────────────────────────

  static override styles = css`
    :host {
      display: block;
      min-height: var(--uc-min-height, auto);
      border-radius: var(--uc-border-radius, 8px);
      background: var(--uc-bg, #fff);
      position: relative;
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 12px;
    }

    .spinner {
      width: var(--uc-spinner-size, 40px);
      height: var(--uc-spinner-size, 40px);
      border: 4px solid #e0e0e0;
      border-top-color: var(--uc-spinner-color, #3f51b5);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-banner {
      padding: 12px 16px;
      background: #ffebee;
      color: #c62828;
      border-radius: 4px;
      font-size: 0.875rem;
      margin-bottom: 12px;
    }

    #payment-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--uc-button-gap, 8px);
    }

    #payment-screen {
      margin-top: var(--uc-payment-screen-margin-top, 16px);
    }
  `;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  override updated(changed: PropertyValues): void {
    super.updated(changed);

    // Auto-launch when required attributes arrive
    if (
      this.autoLaunch &&
      !this._launched &&
      this.captureContext &&
      this.clientLibrary
    ) {
      this.launch();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardown();
  }

  // ─── Public Methods ───────────────────────────────────────────────────────

  /**
   * Starts (or re-starts) the Unified Checkout flow.
   * 1. Loads the SecureAcceptance JS library
   * 2. Calls `Accept(captureContext)`
   * 3. Calls `accept.unifiedPayments(sidebar)`
   * 4. Calls `up.show(containers)`
   * 5. Optionally calls `up.complete(tt)`
   */
  async launch(): Promise<void> {
    this._teardown();
    this._launched = true;
    this._cancelled = false;
    this._loading = true;
    this._error = null;

    this._emit('checkout-loading');

    try {
      await this._loadScript();
      if (this._cancelled) return;

      const accept = await window.Accept(this.captureContext);
      if (this._cancelled) { accept.dispose(); return; }
      this._acceptInstance = accept;

      const sidebar = this.mode === 'sidebar';
      const up = await accept.unifiedPayments(sidebar);
      if (this._cancelled) return;
      this._upInstance = up;

      this._emit<CheckoutReadyDetail>('checkout-ready', {
        unifiedPayments: up,
      });

      // Create light-DOM containers the CyberSource SDK can reach
      // (document.querySelector cannot pierce shadow DOM).
      const btnId = `uc-btns-${this._uid}`;
      const screenId = `uc-screen-${this._uid}`;
      this._ensureLightContainer(btnId);
      this._ensureLightContainer(screenId);

      const showArgs: ShowArgs = {
        containers: {
          paymentSelection: `#${btnId}`,
        },
      };
      if (!sidebar) {
        showArgs.containers.paymentScreen = `#${screenId}`;
      }

      // Wait one frame so light-DOM containers are in the document
      await new Promise((r) => requestAnimationFrame(r));

      this._loading = false;

      const transientToken = await up.show(showArgs);
      if (this._cancelled) return;

      if (this.autoComplete) {
        const completeResponse = await up.complete(transientToken);
        if (this._cancelled) return;

        this._emit<CheckoutCompleteDetail>('checkout-complete', {
          transientToken,
          completeResponse,
        });
      } else {
        this._emit<CheckoutCompleteDetail>('checkout-complete', {
          transientToken,
        });
      }
    } catch (err: unknown) {
      if (this._cancelled) return;
      this._loading = false;

      const detail: CheckoutErrorDetail = { error: err };
      if (err && typeof err === 'object') {
        detail.reason = (err as Record<string, string>).reason;
        detail.message = (err as Record<string, string>).message;
      }

      this._error = detail.message || String(err);
      this._emit<CheckoutErrorDetail>('checkout-error', detail);
    }
  }

  /** Hides the button list. */
  async hide(): Promise<void> {
    await this._upInstance?.hide();
  }

  /** Tears down the current checkout and resets state. */
  reset(): void {
    this._teardown();
    this._loading = false;
    this._error = null;
    this._launched = false;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  override render() {
    return html`
      ${this._error ? html`<div class="error-banner" part="error">${this._error}</div>` : ''}

      ${this._loading
        ? html`
            <div class="loading-overlay" part="loading">
              <div class="spinner" part="spinner"></div>
              <slot name="loading-text"><span>Loading checkout…</span></slot>
            </div>
          `
        : ''}

      <!-- Payment containers live in the light DOM so the SDK can find them -->
      <slot></slot>
    `;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async _loadScript(): Promise<void> {
    if (typeof window.Accept !== 'undefined') return;

    const src = this.clientLibrary;
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${CSS.escape(src)}"]`) as HTMLScriptElement | null;
      if (existing) {
        if (typeof window.Accept !== 'undefined') { resolve(); return; }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () =>
          reject(new Error('Failed to load CyberSource JS library')),
        );
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      if (this.clientLibraryIntegrity) {
        script.integrity = this.clientLibraryIntegrity;
        script.crossOrigin = 'anonymous';
      }
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error('Failed to load CyberSource JS library'));
      document.head.appendChild(script);
    });
  }

  private _teardown(): void {
    this._cancelled = true;
    this._upInstance = null;
    try { this._acceptInstance?.dispose(); } catch { /* ignore */ }
    this._acceptInstance = null;
    this._removeLightContainers();
  }

  /** Append a <div id="..."> as a light-DOM child if it doesn't exist yet. */
  private _ensureLightContainer(id: string): void {
    if (!this.querySelector(`#${id}`)) {
      const el = document.createElement('div');
      el.id = id;
      this.appendChild(el);
    }
  }

  /** Remove the light-DOM containers created by this instance. */
  private _removeLightContainers(): void {
    const btnId = `uc-btns-${this._uid}`;
    const screenId = `uc-screen-${this._uid}`;
    this.querySelector(`#${btnId}`)?.remove();
    this.querySelector(`#${screenId}`)?.remove();
  }

  private _emit<T>(name: string, detail?: T): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'unified-checkout': UnifiedCheckout;
  }
}
