import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { environments } from './environments.js'

const app = new Hono()

type PaymentLinkSessionRequest = {
  card?: {
    holder_name?: string | null
    cvv?: string | null
  }
  payer?: {
    first_name?: string
    last_name?: string
    phone?: string
    email?: string
    document_type?: string
    document_id?: string
    fingerprint_session_id?: string
    state?: string
    city?: string
    address1?: string
  }
  link_id?: string
  commerce_id?: string
  terminal_id?: string
  amount?: number | string
  currency?: string
}

type CheckoutSessionPayload = {
  targetOrigins: string[]
  clientVersion: string
  allowedCardNetworks: string[]
  allowedPaymentTypes: string[]
  country: string
  locale: string
  captureMandate: {
    billingType: 'FULL'
    requestEmail: boolean
    requestPhone: boolean
    requestShipping: boolean
    shipToCountries: string[]
    showAcceptedNetworkIcons: boolean
  }
  orderInformation: {
    amountDetails: {
      totalAmount: string
      currency: string
    }
    billTo: {
      address1: string
      administrativeArea: string
      buildingNumber: string
      country: string
      district: string
      locality: string
      postalCode: string
      email: string
      firstName: string
      lastName: string
      phoneNumber: string
      phoneType: 'mobile'
    }
    shipTo: {
      address1: string
      administrativeArea: string
      buildingNumber: string
      country: string
      district: string
      locality: string
      postalCode: string
      firstName: string
      lastName: string
    }
  }
}

type ProcessPaymentRequest = {
  transientToken?: string
  referenceCode?: string
}

const ALLOWED_CARD_NETWORKS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'JCB', 'DINERSCLUB']
const ALLOWED_PAYMENT_TYPES = ['CLICKTOPAY', 'GOOGLEPAY', 'PANENTRY']

if (process.env.NODE_ENV === 'development') {
  app.use('*', cors())
}

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.post('/v1/payment-links/sessions', async (c) => {
  if (!environments.CHECKOUT_API_KEY) {
    return c.json({ error: 'Missing CHECKOUT_API_KEY environment variable' }, 500)
  }

  if (!environments.CHECKOUT_MERCHANT_ID) {
    return c.json({ error: 'Missing CHECKOUT_MERCHANT_ID environment variable' }, 500)
  }

  let body: PaymentLinkSessionRequest

  try {
    body = await c.req.json<PaymentLinkSessionRequest>()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const validationErrors = validatePaymentLinkSessionRequest(body)
  if (validationErrors.length > 0) {
    return c.json({ error: 'Validation failed', details: validationErrors }, 400)
  }

  const checkoutSessionPayload = buildCheckoutSessionPayload(body)

  const upstreamUrl = `${environments.BASE_URL_CHECKOUT_API}/v1/merchants/${environments.CHECKOUT_MERCHANT_ID}/sessions`

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environments.CHECKOUT_API_KEY}`,
      },
      body: JSON.stringify(checkoutSessionPayload),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json(
      {
        error: 'Failed to connect to checkout API',
        details: message,
      },
      502,
    )
  }

  const upstreamJson = await parseJsonResponse(upstreamResponse)

  if (!upstreamResponse.ok) {
    return new Response(
      JSON.stringify({
        error: 'Checkout API rejected session creation',
        details: upstreamJson,
      }),
      {
        status: upstreamResponse.status,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  return new Response(JSON.stringify(upstreamJson), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

app.post('/v1/merchants/:merchantId/sessions/:sessionId/payment', async (c) => {
  if (!environments.CHECKOUT_API_KEY) {
    return c.json({ error: 'Missing CHECKOUT_API_KEY environment variable' }, 500)
  }

  const merchantId = c.req.param('merchantId')
  const sessionId = c.req.param('sessionId')

  if (!merchantId?.trim()) {
    return c.json({ error: 'merchantId path parameter is required' }, 400)
  }

  if (!sessionId?.trim()) {
    return c.json({ error: 'sessionId path parameter is required' }, 400)
  }

  let body: ProcessPaymentRequest

  try {
    body = await c.req.json<ProcessPaymentRequest>()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.transientToken || !body.transientToken.trim()) {
    return c.json({ error: 'transientToken is required' }, 400)
  }

  const upstreamUrl = `${environments.BASE_URL_CHECKOUT_API}/v1/merchants/${merchantId}/sessions/${sessionId}/payment`
  const paymentPayload = {
    transientToken: body.transientToken,
    ...(body.referenceCode?.trim() ? { referenceCode: body.referenceCode.trim() } : {}),
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environments.CHECKOUT_API_KEY}`,
      },
      body: JSON.stringify(paymentPayload),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json(
      {
        error: 'Failed to connect to checkout API',
        details: message,
      },
      502,
    )
  }

  const upstreamJson = await parseJsonResponse(upstreamResponse)

  if (!upstreamResponse.ok) {
    return new Response(
      JSON.stringify({
        error: 'Checkout API rejected payment processing',
        details: upstreamJson,
      }),
      {
        status: upstreamResponse.status,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  return new Response(JSON.stringify(upstreamJson), {
    status: upstreamResponse.status,
    headers: { 'Content-Type': 'application/json' },
  })
})

app.get('/', (c) => {
  return c.text('Propay API is running')
})

function validatePaymentLinkSessionRequest(body: PaymentLinkSessionRequest): string[] {
  const errors: string[] = []
  const payer = body.payer

  if (!payer) {
    errors.push('payer is required')
    return errors
  }

  if (!body.link_id || !body.link_id.trim()) {
    errors.push('link_id is required')
  }

  if (!body.commerce_id || !body.commerce_id.trim()) {
    errors.push('commerce_id is required')
  }

  if (!body.terminal_id || !body.terminal_id.trim()) {
    errors.push('terminal_id is required')
  }

  if (body.amount === undefined || body.amount === null || Number.isNaN(Number(body.amount))) {
    errors.push('amount must be a valid number')
  } else if (Number(body.amount) <= 0) {
    errors.push('amount must be greater than 0')
  }

  if (!body.currency || !body.currency.trim()) {
    errors.push('currency is required')
  }

  if (!payer.first_name || !payer.first_name.trim()) {
    errors.push('payer.first_name is required')
  }

  if (!payer.last_name || !payer.last_name.trim()) {
    errors.push('payer.last_name is required')
  }

  if (!payer.email || !payer.email.trim()) {
    errors.push('payer.email is required')
  }

  if (!payer.phone || !payer.phone.trim()) {
    errors.push('payer.phone is required')
  }

  if (!payer.state || !payer.state.trim()) {
    errors.push('payer.state is required')
  }

  if (!payer.city || !payer.city.trim()) {
    errors.push('payer.city is required')
  }

  if (!payer.address1 || !payer.address1.trim()) {
    errors.push('payer.address1 is required')
  }

  return errors
}

function buildCheckoutSessionPayload(body: PaymentLinkSessionRequest): CheckoutSessionPayload {
  const payer = body.payer!
  const targetOrigins = environments.UNIFIED_CHECKOUT_TARGET_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return {
    targetOrigins,
    clientVersion: environments.UNIFIED_CHECKOUT_CLIENT_VERSION,
    allowedCardNetworks: ALLOWED_CARD_NETWORKS,
    allowedPaymentTypes: ALLOWED_PAYMENT_TYPES,
    country: environments.UNIFIED_CHECKOUT_COUNTRY,
    locale: environments.UNIFIED_CHECKOUT_LOCALE,
    captureMandate: {
      billingType: 'FULL',
      requestEmail: true,
      requestPhone: true,
      requestShipping: true,
      shipToCountries: ['US', 'GB', 'SV'],
      showAcceptedNetworkIcons: true,
    },
    orderInformation: {
      amountDetails: {
        totalAmount: Number(body.amount).toFixed(2),
        currency: body.currency!.toUpperCase(),
      },
      billTo: {
        address1: payer.address1!,
        administrativeArea: payer.state!,
        buildingNumber: '1',
        country: environments.UNIFIED_CHECKOUT_COUNTRY,
        district: payer.city!,
        locality: payer.city!,
        postalCode: '00000',
        email: payer.email!,
        firstName: payer.first_name!,
        lastName: payer.last_name!,
        phoneNumber: payer.phone!,
        phoneType: 'mobile',
      },
      shipTo: {
        address1: payer.address1!,
        administrativeArea: payer.state!,
        buildingNumber: '1',
        country: environments.UNIFIED_CHECKOUT_COUNTRY,
        district: payer.city!,
        locality: payer.city!,
        postalCode: '00000',
        firstName: payer.first_name!,
        lastName: payer.last_name!,
      },
    },
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return { error: 'Invalid JSON response from checkout API' }
  }
}

serve({
  fetch: app.fetch,
  port: 3001
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
