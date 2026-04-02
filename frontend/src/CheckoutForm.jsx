import { useEffect, useRef, useState } from 'react';

/**
 * Loads the CyberSource SecureAcceptance JS library and renders the Unified Checkout.
 *
 * Uses the official CyberSource API pattern:
 *   const accept = await Accept(captureContext);
 *   const up = await accept.unifiedPayments(sidebar);
 *   const tt = await up.show({containers: {...}});
 *   const response = await up.complete(tt);
 *
 * Props:
 * - captureContext: JWT string from the backend session
 * - clientLibrary: URL of the SecureAcceptance JS library
 * - clientLibraryIntegrity: SRI hash for the script tag
 * - onToken: callback(completeResponse) when checkout returns a token
 * - onError: callback(error) on failure
 */
export default function CheckoutForm({ captureContext, clientLibrary, clientLibraryIntegrity, onToken, onError }) {
  const [loading, setLoading] = useState(true);
  const upRef = useRef(null);

  useEffect(() => {
    if (!captureContext || !clientLibrary) return;

    let cancelled = false;

    async function init() {
      try {
        // Load the CyberSource SecureAcceptance JS library
        if (typeof window.Accept === 'undefined') {
          await new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${clientLibrary}"]`);
            if (existing) {
              if (typeof window.Accept !== 'undefined') {
                resolve();
              } else {
                existing.addEventListener('load', resolve);
                existing.addEventListener('error', reject);
              }
              return;
            }

            const script = document.createElement('script');
            script.src = clientLibrary;
            script.async = true;
            if (clientLibraryIntegrity) {
              script.integrity = clientLibraryIntegrity;
              script.crossOrigin = 'anonymous';
            }
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load CyberSource JS library'));
            document.head.appendChild(script);
          });
        }

        if (cancelled) return;

        // Accept(captureContext) → accept instance
        const accept = await window.Accept(captureContext);
        if (cancelled) return;

        // unifiedPayments(false) = embedded mode, true = sidebar
        const up = await accept.unifiedPayments(false);
        if (cancelled) return;
        upRef.current = up;

        setLoading(false);

        // show() renders the payment UI and resolves with the transient token
        // Both containers must be visible in the DOM before calling show()
        // In embedded mode (sidebar=false), show() returns the final response directly
        const response = await up.show({
          containers: {
            paymentSelection: '#uc-payment-buttons',
            paymentScreen: '#uc-payment-form',
          },
        });

        if (!cancelled) {
          onToken?.(response);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[UC Init Error]', err);
          setLoading(false);
          onError?.(err);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [captureContext, clientLibrary, clientLibraryIntegrity, onToken, onError]);

  return (
    <div className="checkout-form-container">
      {loading && (
        <div className="checkout-loading">
          <div className="spinner" />
          <p>Loading payment form...</p>
        </div>
      )}

      <div
        id="uc-payment-buttons"
        style={{ display: 'flex', flexDirection: 'column' }}
      />

      <div
        id="uc-payment-form"
        style={{ marginTop: '16px' }}
      />
    </div>
  );
}
