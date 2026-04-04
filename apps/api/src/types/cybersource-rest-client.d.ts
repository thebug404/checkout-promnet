declare module 'cybersource-rest-client' {
  interface CybersourceConfig {
    authenticationType: string;
    runEnvironment: string;
    merchantID: string;
    merchantKeyId: string;
    merchantsecretKey: string;
    logConfiguration?: { enableLog?: boolean };
  }

  interface CybersourceApiError {
    response?: { text?: string };
  }

  interface PaymentResponseData {
    id: string;
    status: string;
    reconciliationId: string;
    clientReferenceInformation: Record<string, unknown>;
    orderInformation: Record<string, unknown>;
    processorInformation: Record<string, unknown>;
  }

  type CaptureContextCallback = (
    error: CybersourceApiError | null,
    data: string | null,
    response: unknown,
  ) => void;

  type PaymentCallback = (
    error: CybersourceApiError | null,
    data: PaymentResponseData | null,
    response: unknown,
  ) => void;

  class ApiClient {}

  class UnifiedCheckoutCaptureContextApi {
    constructor(config: CybersourceConfig, apiClient: ApiClient);
    generateUnifiedCheckoutCaptureContext(
      payload: Record<string, unknown>,
      callback: CaptureContextCallback,
    ): void;
  }

  class PaymentsApi {
    constructor(config: CybersourceConfig, apiClient: ApiClient);
    createPayment(request: CreatePaymentRequest, callback: PaymentCallback): void;
  }

  class Ptsv2paymentsClientReferenceInformation {
    code: string;
  }

  class Ptsv2paymentsProcessingInformation {}

  class Ptsv2paymentsTokenInformation {
    transientTokenJwt: string;
  }

  class Ptsv2paymentsOrderInformationAmountDetails {
    totalAmount: string;
    currency: string;
  }

  class Ptsv2paymentsOrderInformation {
    amountDetails: Ptsv2paymentsOrderInformationAmountDetails;
    billTo?: Ptsv2paymentsOrderInformationBillTo;
  }

  class Ptsv2paymentsOrderInformationBillTo {
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

  class CreatePaymentRequest {
    clientReferenceInformation: Ptsv2paymentsClientReferenceInformation;
    processingInformation: Ptsv2paymentsProcessingInformation;
    tokenInformation: Ptsv2paymentsTokenInformation;
    orderInformation: Ptsv2paymentsOrderInformation;
  }

  const api: {
    ApiClient: typeof ApiClient;
    UnifiedCheckoutCaptureContextApi: typeof UnifiedCheckoutCaptureContextApi;
    PaymentsApi: typeof PaymentsApi;
    Ptsv2paymentsClientReferenceInformation: typeof Ptsv2paymentsClientReferenceInformation;
    Ptsv2paymentsProcessingInformation: typeof Ptsv2paymentsProcessingInformation;
    Ptsv2paymentsTokenInformation: typeof Ptsv2paymentsTokenInformation;
    Ptsv2paymentsOrderInformationAmountDetails: typeof Ptsv2paymentsOrderInformationAmountDetails;
    Ptsv2paymentsOrderInformation: typeof Ptsv2paymentsOrderInformation;
    Ptsv2paymentsOrderInformationBillTo: typeof Ptsv2paymentsOrderInformationBillTo;
    CreatePaymentRequest: typeof CreatePaymentRequest;
  };

  export default api;
}
