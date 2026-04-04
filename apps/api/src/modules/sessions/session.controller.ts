import type { AppContext } from '../../types.js';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SessionService } from './session.service.js';
import { PspCredentialService } from '../psp-credentials/psp-credential.service.js';
import {
  CreateSessionDto,
  ProcessPaymentDto,
  CompleteSessionDto,
} from './session.dto.js';
import { validateDto } from '../../shared/utils/validate.js';
import { signPayload } from '../../shared/utils/crypto.js';
import {
  generateCaptureContext,
  processPayment,
  type CybersourcePaymentResult,
  type PaymentOrderInformation,
} from '../../shared/services/cybersource.js';

const sessionService = new SessionService();
const pspCredentialService = new PspCredentialService();

const DEFAULTS = {
  clientVersion: '0.34',
  allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
  allowedPaymentTypes: ['PANENTRY'],
  country: 'US',
  locale: 'en_US',
};

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

  if (body.completeMandate) {
    payload['completeMandate'] = {
      type: body.completeMandate.type ?? 'PREFER_AUTH',
      decisionManager: body.completeMandate.decisionManager ?? false,
      consumerAuthentication: body.completeMandate.consumerAuthentication ?? false,
    };
  }

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

export class SessionController {
  static async create(c: AppContext) {
    const body = await c.req.json();
    const merchant = c.get('merchant');
    const apiKey = c.get('apiKey');

    const createSessionDto = plainToInstance(CreateSessionDto, body);

    const validationErrors = await validate(createSessionDto);
    if (validationErrors.length > 0) {
      const flatten = (errs: typeof validationErrors): string[] =>
        errs.flatMap((err) => [
          ...Object.values(err.constraints ?? {}),
          ...flatten(err.children ?? []),
        ]);
      return c.json({ error: 'Validation failed', details: flatten(validationErrors) }, 400);
    }

    const paymentPayload = buildSessionPayload(createSessionDto);

    const pspCred = await pspCredentialService.findActiveCybersource(merchant.id);
    if (!pspCred || !pspCred.cybersource_merchant_id) {
      return c.json({ error: 'No active CyberSource PSP credentials configured for this merchant' }, 422);
    }

    let captureContext: string;
    let decodedData: Record<string, unknown>;
    try {
      const result = await generateCaptureContext(pspCred, paymentPayload);
      captureContext = result.captureContext;
      decodedData = result.decodedData;
    } catch (err) {
      const error = err as Error;
      console.error('[CyberSource Error]', error.message);
      return c.json({ error: 'Failed to create CyberSource session', details: error.message }, 502);
    }

    const ctx = (decodedData['ctx'] as Array<{ data?: { clientLibrary?: string; clientLibraryIntegrity?: string } }>) ?? [];
    const clientLibrary = ctx[0]?.data?.clientLibrary ?? null;
    const clientLibraryIntegrity = ctx[0]?.data?.clientLibraryIntegrity ?? null;

    const session = await sessionService.create({
      api_key_id: apiKey.id,
      merchant_id: merchant.id,
      capture_context: captureContext,
      status: 'CREATED',
      payment_payload: paymentPayload,
      callback_url: createSessionDto.callback_url ?? null,
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
    });

    return c.json(
      {
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
      },
      201,
    );
  }

  static async findById(c: AppContext) {
    const merchant = c.get('merchant');
    const session = await sessionService.findByIdAndMerchant(c.req.param('id')!, merchant.id);
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
  }

  static async findAll(c: AppContext) {
    const merchant = c.get('merchant');
    const allSessions = await sessionService.findByMerchant(merchant.id);
    const data = allSessions.map((s) => ({
      id: s.id,
      status: s.status,
      expires_at: s.expires_at,
      created_at: s.created_at,
    }));
    return c.json({ data });
  }

  static async processPayment(c: AppContext) {
    const id = c.req.param('id')!;
    const merchant = c.get('merchant');
    const body = await c.req.json();

    const errors = await validateDto(ProcessPaymentDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const dto = body as ProcessPaymentDto;

    const session = await sessionService.findByIdAndMerchant(id, merchant.id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'CREATED') {
      return c.json({ error: `Session cannot be processed. Current status: ${session.status}` }, 409);
    }

    const pspCred = await pspCredentialService.findActiveCybersource(merchant.id);
    if (!pspCred || !pspCred.cybersource_merchant_id) {
      return c.json({ error: 'No active CyberSource credentials' }, 422);
    }

    let paymentResult: CybersourcePaymentResult;
    try {
      paymentResult = await processPayment(pspCred, {
        transientToken: dto.transientToken,
        referenceCode: dto.referenceCode ?? `PUC-${session.id}`,
        orderInformation: session.payment_payload?.['orderInformation'] as PaymentOrderInformation,
      });
    } catch (err) {
      const error = err as Error;
      console.error('[CyberSource Payment Error]', error.message);
      await sessionService.updateStatus(id, { status: 'FAILED', cybersource_error: error.message });
      return c.json({ error: 'Payment processing failed', details: error.message }, 502);
    }

    const status = paymentResult.status === 'AUTHORIZED' ? 'COMPLETED' : 'DECLINED';
    await sessionService.updateStatus(id, {
      status,
      cybersource_payment_id: paymentResult.id,
      cybersource_status: paymentResult.status,
    });

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
  }

  static async complete(c: AppContext) {
    const id = c.req.param('id')!;
    const merchant = c.get('merchant');
    const body = await c.req.json();

    const errors = await validateDto(CompleteSessionDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const dto = body as CompleteSessionDto;

    const session = await sessionService.findByIdAndMerchant(id, merchant.id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'CREATED') {
      return c.json({ error: `Session cannot be completed. Current status: ${session.status}` }, 409);
    }

    const status = dto.status === 'DECLINED' ? 'DECLINED' : 'COMPLETED';
    const updated = await sessionService.updateStatus(id, { status });

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
        id: updated!.id,
        status: updated!.status,
        completed_at: new Date().toISOString(),
      },
    });
  }
}
