/**
 * Displays the result after a transient token is obtained or payment is processed.
 */
export default function PaymentResult({ result, error }) {
  if (error) {
    return (
      <div className="result-card result-error">
        <h3>Error</h3>
        <p>{typeof error === 'string' ? error : error.message || JSON.stringify(error)}</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className={`result-card ${result.status === 'COMPLETED' ? 'result-success' : 'result-info'}`}>
      <h3>
        {result.status === 'COMPLETED' ? 'Payment Successful' : 'Payment Result'}
      </h3>
      <dl className="result-details">
        {result.id && (
          <>
            <dt>Payment ID</dt>
            <dd>{result.id}</dd>
          </>
        )}
        <dt>Status</dt>
        <dd>
          <span className={`badge badge-${result.status?.toLowerCase()}`}>
            {result.status}
          </span>
        </dd>
        {result.reconciliationId && (
          <>
            <dt>Reconciliation ID</dt>
            <dd>{result.reconciliationId}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
