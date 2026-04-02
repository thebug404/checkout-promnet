import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';
import { signPayload } from '../utils/crypto.js';
import { generateCaptureContext, processPayment } from '../services/cybersource.js';

const sessions = new Hono();

// Default session config values
const DEFAULTS = {
  clientVersion: '0.34',
  allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
  allowedPaymentTypes: ['PANENTRY'],
  country: 'US',
  locale: 'en_US',
};

/**
 * Validate the session request payload.
 */
function validateSessionRequest(body) {
  const errors = [];

  // targetOrigins is required
  if (!body.targetOrigins || !Array.isArray(body.targetOrigins) || body.targetOrigins.length === 0) {
    errors.push('targetOrigins is required and must be a non-empty array of URLs');
  } else {
    for (const origin of body.targetOrigins) {
      try {
        new URL(origin);
      } catch {
        errors.push(`Invalid URL in targetOrigins: ${origin}`);
      }
    }
  }

  // Amount is required (either in data.orderInformation or orderInformation)
  const orderInfo = body.data?.orderInformation || body.orderInformation;
  if (!orderInfo?.amountDetails?.totalAmount) {
    errors.push('orderInformation.amountDetails.totalAmount is required');
  }
  if (!orderInfo?.amountDetails?.currency) {
    errors.push('orderInformation.amountDetails.currency is required');
  }

  // Validate allowedCardNetworks if provided
  const validNetworks = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'JCB', 'DINERSCLUB'];
  if (body.allowedCardNetworks) {
    for (const network of body.allowedCardNetworks) {
      if (!validNetworks.includes(network)) {
        errors.push(`Invalid card network: ${network}`);
      }
    }
  }

  // Validate allowedPaymentTypes if provided
  const validPaymentTypes = ['APPLEPAY', 'CHECK', 'CLICKTOPAY', 'GOOGLEPAY', 'PANENTRY', 'PAZE'];
  if (body.allowedPaymentTypes) {
    for (const type of body.allowedPaymentTypes) {
      if (!validPaymentTypes.includes(type)) {
        errors.push(`Invalid payment type: ${type}`);
      }
    }
  }

  // Validate captureMandate if provided
  if (body.captureMandate) {
    const validBillingTypes = ['FULL', 'PARTIAL', 'NONE'];
    if (body.captureMandate.billingType && !validBillingTypes.includes(body.captureMandate.billingType)) {
      errors.push(`Invalid billingType: ${body.captureMandate.billingType}`);
    }
  }

  // Validate completeMandate if provided
  if (body.completeMandate) {
    const validTypes = ['AUTH', 'PREFER_AUTH', 'CAPTURE', 'SALE'];
    if (body.completeMandate.type && !validTypes.includes(body.completeMandate.type)) {
      errors.push(`Invalid completeMandate.type: ${body.completeMandate.type}`);
    }
  }

  return errors;
}

/**
 * Build the Cybersource session payload from the request.
 */
function buildSessionPayload(body) {
  const orderInfo = body.data?.orderInformation || body.orderInformation;

  const payload = {
    clientVersion: body.clientVersion || DEFAULTS.clientVersion,
    targetOrigins: body.targetOrigins,
    allowedCardNetworks: body.allowedCardNetworks || DEFAULTS.allowedCardNetworks,
    allowedPaymentTypes: body.allowedPaymentTypes || DEFAULTS.allowedPaymentTypes,
    country: body.country || DEFAULTS.country,
    locale: body.locale || DEFAULTS.locale,
  };

  // captureMandate
  if (body.captureMandate) {
    payload.captureMandate = {
      billingType: body.captureMandate.billingType || 'FULL',
      requestEmail: body.captureMandate.requestEmail ?? false,
      requestPhone: body.captureMandate.requestPhone ?? false,
      requestShipping: body.captureMandate.requestShipping ?? false,
      shipToCountries: body.captureMandate.shipToCountries || [],
      showAcceptedNetworkIcons: body.captureMandate.showAcceptedNetworkIcons ?? true,
    };
  }

  // completeMandate
  if (body.completeMandate) {
    payload.completeMandate = {
      type: body.completeMandate.type || 'PREFER_AUTH',
      decisionManager: body.completeMandate.decisionManager ?? false,
      consumerAuthentication: body.completeMandate.consumerAuthentication ?? false,
    };
  }

  // Order information
  payload.orderInformation = {
    amountDetails: {
      totalAmount: orderInfo.amountDetails.totalAmount,
      currency: orderInfo.amountDetails.currency,
    },
  };

  // Optional billing info
  if (orderInfo.billTo) {
    payload.orderInformation.billTo = orderInfo.billTo;
  }

  // Optional shipping info
  if (orderInfo.shipTo) {
    payload.orderInformation.shipTo = orderInfo.shipTo;
  }

  return payload;
}

// Create a new payment session
sessions.post('/', requirePermission('sessions', 'create'), async (c) => {
  const body = await c.req.json();
  const merchant = c.get('merchant');
  const apiKey = c.get('apiKey');

  // Validate request
  const errors = validateSessionRequest(body);
  if (errors.length > 0) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  // Build session payload
  const paymentPayload = buildSessionPayload(body);

  // Resolve the merchant's CyberSource PSP credentials
  const pspCred = store.findOne(
    'merchant_psp_credentials',
    (cr) => cr.merchant_id === merchant.id && cr.is_active && cr.psp_name === 'cybersource'
  );
  if (!pspCred || !pspCred.cybersource_merchant_id) {
    return c.json({ error: 'No active CyberSource PSP credentials configured for this merchant' }, 422);
  }

  // Call the real CyberSource Unified Checkout API
  let captureContext, decodedData;
  try {
    const result = await generateCaptureContext(pspCred, paymentPayload);
    captureContext = result.captureContext;
    decodedData = result.decodedData;
  } catch (err) {
    console.error('[CyberSource Error]', err.message);
    return c.json({ error: 'Failed to create CyberSource session', details: err.message }, 502);
  }

  // Extract client library info from decoded JWT
  const clientLibrary = decodedData.ctx?.[0]?.data?.clientLibrary || null;
  const clientLibraryIntegrity = decodedData.ctx?.[0]?.data?.clientLibraryIntegrity || null;

  const session = {
    id: randomUUID(),
    api_key_id: apiKey.id,
    merchant_id: merchant.id,
    capture_context: captureContext,
    status: 'CREATED',
    payment_payload: paymentPayload,
    callback_url: body.callback_url || null,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  store.create('sessions', session);

  return c.json({
    data: {
      id: session.id,
      capture_context: captureContext,
      client_library: clientLibrary,
      client_library_integrity: clientLibraryIntegrity,
      status: session.status,
      payment_payload: session.payment_payload,
      expires_at: session.expires_at,
      created_at: session.created_at,
    },
  }, 201);
});

// Get session by ID
sessions.get('/:id', requirePermission('sessions', 'read'), (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant');

  const session = store.findOne(
    'sessions',
    (s) => s.id === id && s.merchant_id === merchant.id
  );
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({
    data: {
      id: session.id,
      capture_context: session.capture_context,
      status: session.status,
      payment_payload: session.payment_payload,
      callback_url: session.callback_url,
      expires_at: session.expires_at,
      created_at: session.created_at,
    },
  });
});

// List sessions for the authenticated merchant
sessions.get('/', requirePermission('sessions', 'read'), (c) => {
  const merchant = c.get('merchant');
  const allSessions = store.findMany('sessions', (s) => s.merchant_id === merchant.id);

  const data = allSessions.map((s) => ({
    id: s.id,
    status: s.status,
    expires_at: s.expires_at,
    created_at: s.created_at,
  }));

  return c.json({ data });
});

// Process payment using a transient token from Unified Checkout
sessions.post('/:id/payment', requirePermission('sessions', 'create'), async (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant');
  const body = await c.req.json();

  // Validate transient token
  if (!body.transientToken) {
    return c.json({ error: 'transientToken is required' }, 400);
  }

  const session = store.findOne(
    'sessions',
    (s) => s.id === id && s.merchant_id === merchant.id
  );
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (session.status !== 'CREATED') {
    return c.json({ error: `Session cannot be processed. Current status: ${session.status}` }, 409);
  }

  // Get merchant's CyberSource credentials
  const pspCred = store.findOne(
    'merchant_psp_credentials',
    (cr) => cr.merchant_id === merchant.id && cr.is_active && cr.psp_name === 'cybersource'
  );
  if (!pspCred || !pspCred.cybersource_merchant_id) {
    return c.json({ error: 'No active CyberSource credentials' }, 422);
  }

  // Process payment via CyberSource
  let paymentResult;
  try {
    paymentResult = await processPayment(pspCred, {
      transientToken: body.transientToken,
      referenceCode: body.referenceCode || `PUC-${session.id}`,
      orderInformation: session.payment_payload.orderInformation,
    });
  } catch (err) {
    console.error('[CyberSource Payment Error]', err.message);
    store.update('sessions', id, { status: 'FAILED', cybersource_error: err.message });
    return c.json({ error: 'Payment processing failed', details: err.message }, 502);
  }

  // Update session with result
  const status = paymentResult.status === 'AUTHORIZED' ? 'COMPLETED' : 'DECLINED';
  store.update('sessions', id, {
    status,
    cybersource_payment_id: paymentResult.id,
    cybersource_status: paymentResult.status,
  });

  // Webhook callback if configured
  if (session.callback_url) {
    const callbackPayload = {
      session_id: session.id,
      status,
      cybersource_payment_id: paymentResult.id,
      cybersource_status: paymentResult.status,
      merchant_id: merchant.id,
      completed_at: new Date().toISOString(),
    };

    const signature = signPayload(callbackPayload, session.id);

    console.log(`[Webhook] POST ${session.callback_url}`);
    console.log(`[Webhook] X-Signature: ${signature}`);
    console.log(`[Webhook] Payload:`, JSON.stringify(callbackPayload));
  }

  return c.json({
    data: {
      session_id: session.id,
      status,
      cybersource_payment_id: paymentResult.id,
      cybersource_status: paymentResult.status,
      reconciliation_id: paymentResult.reconciliationId,
    },
  });
});

// Manual status update (for testing/admin)
sessions.post('/:id/complete', requirePermission('sessions', 'create'), async (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant');
  const body = await c.req.json();

  const session = store.findOne(
    'sessions',
    (s) => s.id === id && s.merchant_id === merchant.id
  );
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (session.status !== 'CREATED') {
    return c.json({ error: `Session cannot be completed. Current status: ${session.status}` }, 409);
  }

  const status = body.status === 'DECLINED' ? 'DECLINED' : 'COMPLETED';
  const updated = store.update('sessions', id, { status });

  if (session.callback_url) {
    const callbackPayload = {
      session_id: session.id,
      status,
      merchant_id: merchant.id,
      completed_at: new Date().toISOString(),
    };

    const signature = signPayload(callbackPayload, session.id);

    console.log(`[Webhook] POST ${session.callback_url}`);
    console.log(`[Webhook] X-Signature: ${signature}`);
    console.log(`[Webhook] Payload:`, JSON.stringify(callbackPayload));
  }

  return c.json({
    data: {
      id: updated.id,
      status: updated.status,
      completed_at: new Date().toISOString(),
    },
  });
});

export default sessions;
