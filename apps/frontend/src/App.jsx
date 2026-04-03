import { useState, useCallback } from 'react';
import CheckoutWC from './CheckoutWC';
import PaymentResult from './PaymentResult';
import { createSession, processPayment } from './api';
import './App.css';

const STEPS = {
  CONFIG: 'config',
  CHECKOUT: 'checkout',
  PROCESSING: 'processing',
  RESULT: 'result',
};

function Field({ id, label, type = 'text', form, setFn, ...rest }) {
  const value = form[id];
  const onChange = setFn(id);
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {type === 'checkbox' ? (
        <input id={id} type="checkbox" checked={value} onChange={onChange} {...rest} />
      ) : (
        <input id={id} type={type} value={value} onChange={onChange} {...rest} />
      )}
    </div>
  );
}

const DEFAULTS = {
  apiKey: '',
  clientVersion: '0.19',
  allowedCardNetworks: 'VISA,MASTERCARD,AMEX,DISCOVER,JCB,DINERSCLUB',
  allowedPaymentTypes: 'PANENTRY,CLICKTOPAY,GOOGLEPAY',
  country: 'US',
  locale: 'en_US',
  // captureMandate
  billingType: 'FULL',
  requestEmail: true,
  requestPhone: true,
  requestShipping: true,
  shipToCountries: 'US,GB',
  showAcceptedNetworkIcons: true,
  // order
  totalAmount: '21.00',
  currency: 'USD',
  // billTo
  billAddress1: '123 Cool Street',
  billAdministrativeArea: 'NY',
  billBuildingNumber: '12',
  billCountry: 'US',
  billDistrict: 'district',
  billLocality: 'New York',
  billPostalCode: '10172',
  billEmail: 'foo@bar.com',
  billFirstName: 'Viktor',
  billLastName: 'Vaughn',
  billMiddleName: 'F',
  billNameSuffix: 'Jr',
  billTitle: 'Mr',
  billPhoneNumber: '1234567890',
  billPhoneType: 'mobile',
  // shipTo
  shipAddress1: '456 Nice Avenue',
  shipAdministrativeArea: 'CA',
  shipBuildingNumber: '409',
  shipCountry: 'US',
  shipDistrict: 'Uptown',
  shipLocality: 'Los Angeles',
  shipPostalCode: '90010',
  shipFirstName: 'Alan',
  shipLastName: 'Turing',
};

export default function App() {
  const [step, setStep] = useState(STEPS.CONFIG);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  // Form state — all fields
  const [form, setForm] = useState(DEFAULTS);

  // Section toggles
  const [showBilling, setShowBilling] = useState(true);
  const [showShipping, setShowShipping] = useState(true);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    try {
      const origin = window.location.origin;
      const payload = {
        targetOrigins: ["https://localhost:5173"],
        clientVersion: form.clientVersion,
        allowedCardNetworks: form.allowedCardNetworks.split(',').map((s) => s.trim()).filter(Boolean),
        allowedPaymentTypes: form.allowedPaymentTypes.split(',').map((s) => s.trim()).filter(Boolean),
        country: form.country,
        locale: form.locale,
        captureMandate: {
          billingType: form.billingType,
          requestEmail: form.requestEmail,
          requestPhone: form.requestPhone,
          requestShipping: form.requestShipping,
          shipToCountries: form.shipToCountries.split(',').map((s) => s.trim()).filter(Boolean),
          showAcceptedNetworkIcons: form.showAcceptedNetworkIcons,
        },
        orderInformation: {
          amountDetails: {
            totalAmount: form.totalAmount,
            currency: form.currency,
          },
          billTo: {
            address1: form.billAddress1,
            administrativeArea: form.billAdministrativeArea,
            buildingNumber: form.billBuildingNumber,
            country: form.billCountry,
            district: form.billDistrict,
            locality: form.billLocality,
            postalCode: form.billPostalCode,
            email: form.billEmail,
            firstName: form.billFirstName,
            lastName: form.billLastName,
            middleName: form.billMiddleName,
            nameSuffix: form.billNameSuffix,
            title: form.billTitle,
            phoneNumber: form.billPhoneNumber,
            phoneType: form.billPhoneType,
          },
          shipTo: {
            address1: form.shipAddress1,
            administrativeArea: form.shipAdministrativeArea,
            buildingNumber: form.shipBuildingNumber,
            country: form.shipCountry,
            district: form.shipDistrict,
            locality: form.shipLocality,
            postalCode: form.shipPostalCode,
            firstName: form.shipFirstName,
            lastName: form.shipLastName,
          },
        },
      };

      const res = await createSession(form.apiKey, payload);
      setSessionData(res.data);
      setStep(STEPS.CHECKOUT);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToken = useCallback(
    async (completeResponse) => {
      setStep(STEPS.PROCESSING);
      setError(null);

      try {
        // completeResponse comes from up.complete(transientToken)
        // It may be a string (JWT) or an object. Pass it to our backend for processing.
        const token = typeof completeResponse === 'string'
          ? completeResponse
          : completeResponse?.transientToken || JSON.stringify(completeResponse);

        const res = await processPayment(
          form.apiKey,
          sessionData.id,
          token,
          `REF-${Date.now()}`
        );
        setPaymentResult(res.data);
        setStep(STEPS.RESULT);
      } catch (err) {
        setError(err.message);
        setStep(STEPS.RESULT);
      }
    },
    [form.apiKey, sessionData]
  );

  const handleCheckoutError = useCallback((err) => {
    setError(typeof err === 'string' ? err : err.message || JSON.stringify(err));
    setStep(STEPS.RESULT);
  }, []);

  const handleReset = () => {
    setStep(STEPS.CONFIG);
    setSessionData(null);
    setPaymentResult(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>CyberSource Unified Checkout</h1>
        <p className="subtitle">Payment Integration Demo</p>
      </header>

      <main className="app-main">
        {/* Step 1: Configuration */}
        {step === STEPS.CONFIG && (
          <section className="card">
            <h2>Session Configuration</h2>
            <form onSubmit={handleCreateSession}>
              {/* API Key */}
              <div className="form-group">
                <label htmlFor="apiKey">API Key</label>
                <input
                  id="apiKey"
                  type="password"
                  value={form.apiKey}
                  onChange={set('apiKey')}
                  placeholder="puc_live_xxxxxxxx_..."
                  required
                />
                <small>The raw API key generated during seed or via POST /v1/api-keys</small>
              </div>

              {/* Session params */}
              <fieldset className="section">
                <legend>Session Parameters</legend>
                <div className="form-row">
                  <Field form={form} setFn={set} id="clientVersion" label="Client Version" />
                  <Field form={form} setFn={set} id="country" label="Country" />
                  <Field form={form} setFn={set} id="locale" label="Locale" />
                </div>
                <Field form={form} setFn={set} id="allowedCardNetworks" label="Allowed Card Networks (comma-separated)" />
                <Field form={form} setFn={set} id="allowedPaymentTypes" label="Allowed Payment Types (comma-separated)" />
              </fieldset>

              {/* Capture Mandate */}
              <fieldset className="section">
                <legend>Capture Mandate</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="billingType">Billing Type</label>
                    <select id="billingType" value={form.billingType} onChange={set('billingType')}>
                      <option value="FULL">FULL</option>
                      <option value="PARTIAL">PARTIAL</option>
                      <option value="NONE">NONE</option>
                    </select>
                  </div>
                  <Field form={form} setFn={set} id="shipToCountries" label="Ship To Countries" />
                </div>
                <div className="checkbox-row">
                  <label><input type="checkbox" checked={form.requestEmail} onChange={set('requestEmail')} /> Request Email</label>
                  <label><input type="checkbox" checked={form.requestPhone} onChange={set('requestPhone')} /> Request Phone</label>
                  <label><input type="checkbox" checked={form.requestShipping} onChange={set('requestShipping')} /> Request Shipping</label>
                  <label><input type="checkbox" checked={form.showAcceptedNetworkIcons} onChange={set('showAcceptedNetworkIcons')} /> Show Network Icons</label>
                </div>
              </fieldset>

              {/* Order Information */}
              <fieldset className="section">
                <legend>Order Information</legend>
                <div className="form-row">
                  <Field form={form} setFn={set} id="totalAmount" label="Total Amount" />
                  <div className="form-group">
                    <label htmlFor="currency">Currency</label>
                    <select id="currency" value={form.currency} onChange={set('currency')}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="PEN">PEN</option>
                      <option value="MXN">MXN</option>
                      <option value="COP">COP</option>
                      <option value="BRL">BRL</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Bill To */}
              <fieldset className="section">
                <legend>
                  <button type="button" className="toggle-btn" onClick={() => setShowBilling((v) => !v)}>
                    {showBilling ? '▾' : '▸'} Billing Address
                  </button>
                </legend>
                {showBilling && (
                  <div className="section-body">
                    <div className="form-row">
                      <Field form={form} setFn={set} id="billFirstName" label="First Name" />
                      <Field form={form} setFn={set} id="billMiddleName" label="Middle Name" />
                      <Field form={form} setFn={set} id="billLastName" label="Last Name" />
                    </div>
                    <div className="form-row">
                      <Field form={form} setFn={set} id="billTitle" label="Title" />
                      <Field form={form} setFn={set} id="billNameSuffix" label="Suffix" />
                    </div>
                    <Field form={form} setFn={set} id="billAddress1" label="Address" />
                    <div className="form-row">
                      <Field form={form} setFn={set} id="billBuildingNumber" label="Building #" />
                      <Field form={form} setFn={set} id="billDistrict" label="District" />
                    </div>
                    <div className="form-row">
                      <Field form={form} setFn={set} id="billLocality" label="City" />
                      <Field form={form} setFn={set} id="billAdministrativeArea" label="State" />
                      <Field form={form} setFn={set} id="billPostalCode" label="Postal Code" />
                      <Field form={form} setFn={set} id="billCountry" label="Country" />
                    </div>
                    <div className="form-row">
                      <Field form={form} setFn={set} id="billEmail" label="Email" type="email" />
                      <Field form={form} setFn={set} id="billPhoneNumber" label="Phone" />
                      <Field form={form} setFn={set} id="billPhoneType" label="Phone Type" />
                    </div>
                  </div>
                )}
              </fieldset>

              {/* Ship To */}
              <fieldset className="section">
                <legend>
                  <button type="button" className="toggle-btn" onClick={() => setShowShipping((v) => !v)}>
                    {showShipping ? '▾' : '▸'} Shipping Address
                  </button>
                </legend>
                {showShipping && (
                  <div className="section-body">
                    <div className="form-row">
                      <Field form={form} setFn={set} id="shipFirstName" label="First Name" />
                      <Field form={form} setFn={set} id="shipLastName" label="Last Name" />
                    </div>
                    <Field form={form} setFn={set} id="shipAddress1" label="Address" />
                    <div className="form-row">
                      <Field form={form} setFn={set} id="shipBuildingNumber" label="Building #" />
                      <Field form={form} setFn={set} id="shipDistrict" label="District" />
                    </div>
                    <div className="form-row">
                      <Field form={form} setFn={set} id="shipLocality" label="City" />
                      <Field form={form} setFn={set} id="shipAdministrativeArea" label="State" />
                      <Field form={form} setFn={set} id="shipPostalCode" label="Postal Code" />
                      <Field form={form} setFn={set} id="shipCountry" label="Country" />
                    </div>
                  </div>
                )}
              </fieldset>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                Create Session
              </button>
            </form>
          </section>
        )}

        {/* Step 2: Checkout form */}
        {step === STEPS.CHECKOUT && sessionData && (
          <section className="card">
            <h2>Complete Payment</h2>
            <p className="session-info">
              Session: <code>{sessionData.id}</code>
            </p>

            <CheckoutWC
              captureContext={sessionData.capture_context}
              clientLibrary={sessionData.client_library}
              clientLibraryIntegrity={sessionData.client_library_integrity}
              onToken={handleToken}
              onError={handleCheckoutError}
            />

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              style={{ marginTop: '16px' }}
            >
              Cancel
            </button>
          </section>
        )}

        {/* Step 3: Processing */}
        {step === STEPS.PROCESSING && (
          <section className="card card-center">
            <div className="spinner" />
            <p>Processing payment...</p>
          </section>
        )}

        {/* Step 4: Result */}
        {step === STEPS.RESULT && (
          <section className="card">
            <PaymentResult result={paymentResult} error={error} />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReset}
              style={{ marginTop: '16px' }}
            >
              New Payment
            </button>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Backend API: <code>http://localhost:3000</code> &middot;
          Uses CyberSource Unified Checkout JS SDK
        </p>
      </footer>
    </div>
  );
}