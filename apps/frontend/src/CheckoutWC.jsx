import { useEffect, useRef } from 'react';
import 'wc-unified-checkout';

/**
 * React wrapper for `<unified-checkout>` web component.
 *
 * Props:
 * - captureContext: JWT string from the backend session
 * - clientLibrary: URL of the SecureAcceptance JS library
 * - clientLibraryIntegrity: SRI hash for the script tag
 * - mode: 'embedded' | 'sidebar' (default: 'embedded')
 * - onToken: callback({ transientToken, completeResponse? }) on checkout-complete
 * - onError: callback({ error, reason?, message? }) on checkout-error
 * - onReady: callback({ unifiedPayments }) when SDK is ready
 */
export default function CheckoutWC({
  captureContext,
  clientLibrary,
  clientLibraryIntegrity,
  mode = 'embedded',
  onToken,
  onError,
  onReady,
}) {
  const ref = useRef(null);

  // Wire up custom event listeners
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleComplete = (e) => onToken?.(e.detail);
    const handleError = (e) => onError?.(e.detail);
    const handleReady = (e) => onReady?.(e.detail);

    el.addEventListener('checkout-complete', handleComplete);
    el.addEventListener('checkout-error', handleError);
    el.addEventListener('checkout-ready', handleReady);

    return () => {
      el.removeEventListener('checkout-complete', handleComplete);
      el.removeEventListener('checkout-error', handleError);
      el.removeEventListener('checkout-ready', handleReady);
    };
  }, [onToken, onError, onReady]);

  return (
    <unified-checkout
      ref={ref}
      capture-context={captureContext}
      client-library={clientLibrary}
      client-library-integrity={clientLibraryIntegrity || ''}
      mode={mode}
      auto-launch
    />
  );
}
