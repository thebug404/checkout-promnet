import cybersourceRestApi from 'cybersource-rest-client';
import type { PspCredentialEntity } from '../../modules/psp-credentials/psp-credential.entity.js';

export interface CaptureContextResult {
  captureContext: string;
  decodedData: Record<string, unknown>;
}

interface BillToInfo {
  firstName?: string;
  lastName?: string;
  address1?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  country?: string;
  email?: string;
  phoneNumber?: string;
}

export interface PaymentOrderInformation {
  amountDetails: {
    totalAmount: string;
    currency: string;
  };
  billTo?: BillToInfo;
}

export interface CybersourcePaymentRequest {
  transientToken: string;
  referenceCode?: string;
  orderInformation: PaymentOrderInformation;
}

export interface CybersourcePaymentResult {
  id: string;
  status: string;
  reconciliationId: string;
  clientReferenceInformation: Record<string, unknown>;
  orderInformation: Record<string, unknown>;
  processorInformation: Record<string, unknown>;
}

function buildConfig(pspCredential: PspCredentialEntity) {
  return {
    authenticationType: 'http_signature',
    runEnvironment: 'apitest.cybersource.com',
    merchantID: pspCredential.cybersource_merchant_id!,
    merchantKeyId: pspCredential.cybersource_key_id!,
    merchantsecretKey: pspCredential.cybersource_secret_key!,
    logConfiguration: {
      enableLog: false,
    },
  };
}

/**
 * Generate a Unified Checkout Capture Context (session) via CyberSource API.
 * Returns a JWT capture context string.
 */
export function generateCaptureContext(
  pspCredential: PspCredentialEntity,
  requestPayload: Record<string, unknown>,
): Promise<CaptureContextResult> {
  return new Promise<CaptureContextResult>((resolve, reject) => {
    const configObject = buildConfig(pspCredential);
    const apiClient = new cybersourceRestApi.ApiClient();
    const instance = new cybersourceRestApi.UnifiedCheckoutCaptureContextApi(configObject, apiClient);

    instance.generateUnifiedCheckoutCaptureContext(requestPayload, (error, data, _response) => {
      if (error) {
        const message = error.response?.text || JSON.stringify(error);
        reject(new Error(`CyberSource capture context error: ${message}`));
        return;
      }

      if (!data) {
        reject(new Error('CyberSource returned empty capture context'));
        return;
      }

      try {
        const parts = data.split('.');
        const decodedData = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as Record<string, unknown>;
        resolve({ captureContext: data, decodedData });
      } catch (err) {
        const parseError = err as Error;
        reject(new Error(`Failed to decode capture context JWT: ${parseError.message}`));
      }
    });
  });
}

/**
 * Process a payment using a transient token from Unified Checkout.
 */
export function processPayment(
  pspCredential: PspCredentialEntity,
  paymentRequest: CybersourcePaymentRequest,
): Promise<CybersourcePaymentResult> {
  return new Promise<CybersourcePaymentResult>((resolve, reject) => {
    const configObject = buildConfig(pspCredential);
    const apiClient = new cybersourceRestApi.ApiClient();
    const instance = new cybersourceRestApi.PaymentsApi(configObject, apiClient);

    const clientReferenceInformation = new cybersourceRestApi.Ptsv2paymentsClientReferenceInformation();
    clientReferenceInformation.code = paymentRequest.referenceCode || `PUC-${Date.now()}`;

    const processingInformation = new cybersourceRestApi.Ptsv2paymentsProcessingInformation();

    const tokenInformation = new cybersourceRestApi.Ptsv2paymentsTokenInformation();
    tokenInformation.transientTokenJwt = paymentRequest.transientToken;

    const amountDetails = new cybersourceRestApi.Ptsv2paymentsOrderInformationAmountDetails();
    amountDetails.totalAmount = paymentRequest.orderInformation.amountDetails.totalAmount;
    amountDetails.currency = paymentRequest.orderInformation.amountDetails.currency;

    const orderInformation = new cybersourceRestApi.Ptsv2paymentsOrderInformation();
    orderInformation.amountDetails = amountDetails;

    if (paymentRequest.orderInformation.billTo) {
      const billTo = new cybersourceRestApi.Ptsv2paymentsOrderInformationBillTo();
      const bt = paymentRequest.orderInformation.billTo;
      if (bt.firstName) billTo.firstName = bt.firstName;
      if (bt.lastName) billTo.lastName = bt.lastName;
      if (bt.address1) billTo.address1 = bt.address1;
      if (bt.locality) billTo.locality = bt.locality;
      if (bt.administrativeArea) billTo.administrativeArea = bt.administrativeArea;
      if (bt.postalCode) billTo.postalCode = bt.postalCode;
      if (bt.country) billTo.country = bt.country;
      if (bt.email) billTo.email = bt.email;
      if (bt.phoneNumber) billTo.phoneNumber = bt.phoneNumber;
      orderInformation.billTo = billTo;
    }

    const request = new cybersourceRestApi.CreatePaymentRequest();
    request.clientReferenceInformation = clientReferenceInformation;
    request.processingInformation = processingInformation;
    request.tokenInformation = tokenInformation;
    request.orderInformation = orderInformation;

    instance.createPayment(request, (error, data, _response) => {
      if (error) {
        const message = error.response?.text || JSON.stringify(error);
        reject(new Error(`CyberSource payment error: ${message}`));
        return;
      }

      if (!data) {
        reject(new Error('CyberSource returned empty payment response'));
        return;
      }

      resolve({
        id: data.id,
        status: data.status,
        reconciliationId: data.reconciliationId,
        clientReferenceInformation: data.clientReferenceInformation,
        orderInformation: data.orderInformation,
        processorInformation: data.processorInformation,
      });
    });
  });
}
