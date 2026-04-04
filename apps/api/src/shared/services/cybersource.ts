// @ts-nocheck
import cybersourceRestApi from 'cybersource-rest-client';

/**
 * Build a CyberSource configuration object from PSP credentials.
 */
function buildConfig(pspCredential) {
  return {
    authenticationType: 'http_signature',
    runEnvironment: 'apitest.cybersource.com',
    merchantID: pspCredential.cybersource_merchant_id,
    merchantKeyId: pspCredential.cybersource_key_id,
    merchantsecretKey: pspCredential.cybersource_secret_key,
    logConfiguration: {
      enableLog: false,
    },
  };
}

/**
 * Generate a Unified Checkout Capture Context (session) via CyberSource API.
 * Returns a JWT capture context string.
 */
export function generateCaptureContext(pspCredential, requestPayload) {
  return new Promise((resolve, reject) => {
    const configObject = buildConfig(pspCredential);
    const apiClient = new cybersourceRestApi.ApiClient();
    const instance = new cybersourceRestApi.UnifiedCheckoutCaptureContextApi(configObject, apiClient);

    instance.generateUnifiedCheckoutCaptureContext(requestPayload, (error, data, response) => {
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
        const decodedData = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        resolve({ captureContext: data, decodedData });
      } catch (err) {
        reject(new Error(`Failed to decode capture context JWT: ${err.message}`));
      }
    });
  });
}

/**
 * Process a payment using a transient token from Unified Checkout.
 */
export function processPayment(pspCredential, paymentRequest) {
  return new Promise((resolve, reject) => {
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

    instance.createPayment(request, (error, data, response) => {
      if (error) {
        const message = error.response?.text || JSON.stringify(error);
        reject(new Error(`CyberSource payment error: ${message}`));
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
