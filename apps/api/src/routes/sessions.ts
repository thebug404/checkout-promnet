import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';
import { signPayload } from '../utils/crypto.js';
import { generateCaptureContext, processPayment } from '../services/cybersource.js';
import { validateDto } from '../utils/validate.js';
import { CreateSessionDto, ProcessPaymentDto, CompleteSessionDto, OrderInformationDto, AmountDetailsDto, BillToDto, ShipToDto, CaptureMandateDto, CompleteMandateDto } from '../dtos/session.dto.js';
import { validate } from 'class-validator';

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
 * Build the Cybersource session payload from a validated DTO.
 */
function buildSessionPayload(body: CreateSessionDto) {
  const orderInfo = body.orderInformation;

  const payload: Record<string, unknown> = {
    clientVersion: body.clientVersion ?? DEFAULTS.clientVersion,
    targetOrigins: body.targetOrigins,
    allowedCardNetworks: body.allowedCardNetworks ?? DEFAULTS.allowedCardNetworks,
    allowedPaymentTypes: body.allowedPaymentTypes ?? DEFAULTS.allowedPaymentTypes,
    country: body.country ?? DEFAULTS.country,
    locale: body.locale ?? DEFAULTS.locale,
  };

  // captureMandate
  if (body.captureMandate) {
    payload['captureMandate'] = {
      billingType: body.captureMandate.billingType ?? 'FULL',
      requestEmail: body.captureMandate.requestEmail ?? false,
      requestPhone: body.captureMandate.requestPhone ?? false,
      requestShipping: body.captureMandate.requestShipping ?? false,
      shipToCountries: body.captureMandate.shipToCountries ?? [],
      showAcceptedNetworkIcons: body.captureMandate.showAcceptedNetworkIcons ?? true,
    };
  }

  // completeMandate
  if (body.completeMandate) {
    payload['completeMandate'] = {
      type: body.completeMandate.type ?? 'PREFER_AUTH',
      decisionManager: body.completeMandate.decisionManager ?? false,
      consumerAuthentication: body.completeMandate.consumerAuthentication ?? false,
    };
  }

  // Order information
  const orderInformationPayload: Record<string, unknown> = {
    amountDetails: {
      totalAmount: orderInfo.amountDetails.totalAmount,
      currency: orderInfo.amountDetails.currency,
    },
  };
  if (orderInfo.billTo) orderInformationPayload['billTo'] = orderInfo.billTo;
  if (orderInfo.shipTo) orderInformationPayload['shipTo'] = orderInfo.shipTo;
  payload['orderInformation'] = orderInformationPayload;

  return payload;
}

// Create a new payment session
sessions.post('/', requirePermission('sessions', 'create'), async (c) => {
  const body = await c.req.json();
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const apiKey = c.get('apiKey' as never) as Record<string, unknown>;

  const createSessionDto = new CreateSessionDto();
  createSessionDto.targetOrigins = body.targetOrigins;
  createSessionDto.clientVersion = body.clientVersion;
  createSessionDto.allowedCardNetworks = body.allowedCardNetworks;
  createSessionDto.allowedPaymentTypes = body.allowedPaymentTypes;
  createSessionDto.country = body.country;
  createSessionDto.locale = body.locale;
  createSessionDto.callback_url = body.callback_url;

  const orderInformationDto = new OrderInformationDto();

  const amountDetailsDto = new AmountDetailsDto();
  amountDetailsDto.totalAmount = body.orderInformation?.amountDetails?.totalAmount;
  amountDetailsDto.currency = body.orderInformation?.amountDetails?.currency;
  orderInformationDto.amountDetails = amountDetailsDto;

  if (body.orderInformation?.billTo) {
    const billToDto = new BillToDto();
    billToDto.address1 = body.orderInformation.billTo.address1;
    billToDto.administrativeArea = body.orderInformation.billTo.administrativeArea;
    billToDto.buildingNumber = body.orderInformation.billTo.buildingNumber;
    billToDto.country = body.orderInformation.billTo.country;
    billToDto.district = body.orderInformation.billTo.district;
    billToDto.locality = body.orderInformation.billTo.locality;
    billToDto.postalCode = body.orderInformation.billTo.postalCode;
    billToDto.email = body.orderInformation.billTo.email;
    billToDto.firstName = body.orderInformation.billTo.firstName;
    billToDto.lastName = body.orderInformation.billTo.lastName;
    billToDto.middleName = body.orderInformation.billTo.middleName;
    billToDto.nameSuffix = body.orderInformation.billTo.nameSuffix;
    billToDto.title = body.orderInformation.billTo.title;
    billToDto.phoneNumber = body.orderInformation.billTo.phoneNumber;
    billToDto.phoneType = body.orderInformation.billTo.phoneType;
    orderInformationDto.billTo = billToDto;
  }

  if (body.orderInformation?.shipTo) {
    const shipToDto = new ShipToDto();
    shipToDto.address1 = body.orderInformation.shipTo.address1;
    shipToDto.administrativeArea = body.orderInformation.shipTo.administrativeArea;
    shipToDto.buildingNumber = body.orderInformation.shipTo.buildingNumber;
    shipToDto.country = body.orderInformation.shipTo.country;
    shipToDto.district = body.orderInformation.shipTo.district;
    shipToDto.locality = body.orderInformation.shipTo.locality;
    shipToDto.postalCode = body.orderInformation.shipTo.postalCode;
    shipToDto.firstName = body.orderInformation.shipTo.firstName;
    shipToDto.lastName = body.orderInformation.shipTo.lastName;
    orderInformationDto.shipTo = shipToDto;
  }

  createSessionDto.orderInformation = orderInformationDto;

  if (body.captureMandate) {
    const captureMandateDto = new CaptureMandateDto();
    captureMandateDto.billingType = body.captureMandate.billingType;
    captureMandateDto.requestEmail = body.captureMandate.requestEmail;
    captureMandateDto.requestPhone = body.captureMandate.requestPhone;
    captureMandateDto.requestShipping = body.captureMandate.requestShipping;
    captureMandateDto.shipToCountries = body.captureMandate.shipToCountries;
    captureMandateDto.showAcceptedNetworkIcons = body.captureMandate.showAcceptedNetworkIcons;
    createSessionDto.captureMandate = captureMandateDto;
  }

  if (body.completeMandate) {
    const completeMandateDto = new CompleteMandateDto();
    completeMandateDto.type = body.completeMandate.type;
    completeMandateDto.decisionManager = body.completeMandate.decisionManager;
    completeMandateDto.consumerAuthentication = body.completeMandate.consumerAuthentication;
    createSessionDto.completeMandate = completeMandateDto;
  }

  const validationErrors = await validate(createSessionDto);
  if (validationErrors.length > 0) {
    const flatten = (errs: typeof validationErrors): string[] =>
      errs.flatMap(err => [
        ...Object.values(err.constraints ?? {}),
        ...flatten(err.children ?? []),
      ]);
    return c.json({ error: 'Validation failed', details: flatten(validationErrors) }, 400);
  }

  const paymentPayload = buildSessionPayload(createSessionDto);

  // Resolve the merchant's CyberSource PSP credentials
  const pspCred = store.findOne(
    'merchant_psp_credentials',
    (cr: Record<string, unknown>) => cr['merchant_id'] === merchant['id'] && Boolean(cr['is_active']) && cr['psp_name'] === 'cybersource'
  );
  if (!pspCred || !(pspCred as Record<string, unknown>)['cybersource_merchant_id']) {
    return c.json({ error: 'No active CyberSource PSP credentials configured for this merchant' }, 422);
  }

  // Call the real CyberSource Unified Checkout API
  let captureContext: string;
  let decodedData: Record<string, unknown>;
  try {
    const result = await generateCaptureContext(pspCred, paymentPayload) as { captureContext: string; decodedData: Record<string, unknown> };
    captureContext = result.captureContext;
    decodedData = result.decodedData;
  } catch (err) {
    const error = err as Error;
    console.error('[CyberSource Error]', error.message);
    return c.json({ error: 'Failed to create CyberSource session', details: error.message }, 502);
  }

  // Extract client library info from decoded JWT
  const ctx = (decodedData['ctx'] as Array<{ data?: { clientLibrary?: string; clientLibraryIntegrity?: string } }>) ?? [];
  const clientLibrary = ctx[0]?.data?.clientLibrary ?? null;
  const clientLibraryIntegrity = ctx[0]?.data?.clientLibraryIntegrity ?? null;

  const session = {
    id: randomUUID(),
    api_key_id: apiKey['id'],
    merchant_id: merchant['id'],
    capture_context: captureContext,
    status: 'CREATED',
    payment_payload: paymentPayload,
    callback_url: createSessionDto.callback_url ?? null,
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
  const merchant = c.get('merchant' as never) as Record<string, unknown>;

  const session = store.findOne(
    'sessions',
    (s: Record<string, unknown>) => s['id'] === id && s['merchant_id'] === merchant['id']
  ) as Record<string, unknown> | null;
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({
    data: {
      id: session['id'],
      capture_context: session['capture_context'],
      status: session['status'],
      payment_payload: session['payment_payload'],
      callback_url: session['callback_url'],
      expires_at: session['expires_at'],
      created_at: session['created_at'],
    },
  });
});

// List sessions for the authenticated merchant
sessions.get('/', requirePermission('sessions', 'read'), (c) => {
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const allSessions = store.findMany('sessions', (s: Record<string, unknown>) => s['merchant_id'] === merchant['id']) as Record<string, unknown>[];

  const data = allSessions.map((s) => ({
    id: s['id'],
    status: s['status'],
    expires_at: s['expires_at'],
    created_at: s['created_at'],
  }));

  return c.json({ data });
});

// Process payment using a transient token from Unified Checkout
sessions.post('/:id/payment', requirePermission('sessions', 'create'), async (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const body = await c.req.json();

  const errors = await validateDto(ProcessPaymentDto, body);
  if (errors) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const dto = body as ProcessPaymentDto;

  const session = store.findOne(
    'sessions',
    (s: Record<string, unknown>) => s['id'] === id && s['merchant_id'] === merchant['id']
  ) as Record<string, unknown> | null;
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (session['status'] !== 'CREATED') {
    return c.json({ error: `Session cannot be processed. Current status: ${session['status']}` }, 409);
  }

  // Get merchant's CyberSource credentials
  const pspCred = store.findOne(
    'merchant_psp_credentials',
    (cr: Record<string, unknown>) => cr['merchant_id'] === merchant['id'] && Boolean(cr['is_active']) && cr['psp_name'] === 'cybersource'
  );
  if (!pspCred || !(pspCred as Record<string, unknown>)['cybersource_merchant_id']) {
    return c.json({ error: 'No active CyberSource credentials' }, 422);
  }

  // Process payment via CyberSource
  let paymentResult: Record<string, unknown>;
  try {
    paymentResult = await processPayment(pspCred, {
      transientToken: dto.transientToken,
      referenceCode: dto.referenceCode ?? `PUC-${session['id']}`,
      orderInformation: (session['payment_payload'] as Record<string, unknown>)['orderInformation'],
    }) as Record<string, unknown>;
  } catch (err) {
    const error = err as Error;
    console.error('[CyberSource Payment Error]', error.message);
    store.update('sessions', id, { status: 'FAILED', cybersource_error: error.message });
    return c.json({ error: 'Payment processing failed', details: error.message }, 502);
  }

  // Update session with result
  const status = paymentResult['status'] === 'AUTHORIZED' ? 'COMPLETED' : 'DECLINED';
  store.update('sessions', id, {
    status,
    cybersource_payment_id: paymentResult['id'],
    cybersource_status: paymentResult['status'],
  });

  // Webhook callback if configured
  if (session['callback_url']) {
    const callbackPayload = {
      session_id: session['id'],
      status,
      cybersource_payment_id: paymentResult['id'],
      cybersource_status: paymentResult['status'],
      merchant_id: merchant['id'],
      completed_at: new Date().toISOString(),
    };

    const signature = signPayload(callbackPayload, session['id'] as string);

    console.log(`[Webhook] POST ${session['callback_url']}`);
    console.log(`[Webhook] X-Signature: ${signature}`);
    console.log(`[Webhook] Payload:`, JSON.stringify(callbackPayload));
  }

  return c.json({
    data: {
      session_id: session['id'],
      status,
      cybersource_payment_id: paymentResult['id'],
      cybersource_status: paymentResult['status'],
      reconciliation_id: paymentResult['reconciliationId'],
    },
  });
});

// Manual status update (for testing/admin)
sessions.post('/:id/complete', requirePermission('sessions', 'create'), async (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const body = await c.req.json();

  const errors = await validateDto(CompleteSessionDto, body);
  if (errors) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const dto = body as CompleteSessionDto;

  const session = store.findOne(
    'sessions',
    (s: Record<string, unknown>) => s['id'] === id && s['merchant_id'] === merchant['id']
  ) as Record<string, unknown> | null;
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (session['status'] !== 'CREATED') {
    return c.json({ error: `Session cannot be completed. Current status: ${session['status']}` }, 409);
  }

  const status = dto.status === 'DECLINED' ? 'DECLINED' : 'COMPLETED';
  const updated = store.update('sessions', id, { status }) as Record<string, unknown>;

  if (session['callback_url']) {
    const callbackPayload = {
      session_id: session['id'],
      status,
      merchant_id: merchant['id'],
      completed_at: new Date().toISOString(),
    };

    const signature = signPayload(callbackPayload, session['id'] as string);

    console.log(`[Webhook] POST ${session['callback_url']}`);
    console.log(`[Webhook] X-Signature: ${signature}`);
    console.log(`[Webhook] Payload:`, JSON.stringify(callbackPayload));
  }

  return c.json({
    data: {
      id: updated['id'],
      status: updated['status'],
      completed_at: new Date().toISOString(),
    },
  });
});

export default sessions;
