import dotenv from 'dotenv';

dotenv.config();

export const environments = {
  BASE_URL_CHECKOUT_API: process.env.BASE_URL_CHECKOUT_API || 'http://localhost:3000',
  CHECKOUT_MERCHANT_ID: process.env.CHECKOUT_MERCHANT_ID || '',
  CHECKOUT_API_KEY: process.env.CHECKOUT_API_KEY || '',
  UNIFIED_CHECKOUT_TARGET_ORIGINS:
    process.env.UNIFIED_CHECKOUT_TARGET_ORIGINS || 'https://localhost:5175',
  UNIFIED_CHECKOUT_CLIENT_VERSION: process.env.UNIFIED_CHECKOUT_CLIENT_VERSION || '0.19',
  UNIFIED_CHECKOUT_COUNTRY: process.env.UNIFIED_CHECKOUT_COUNTRY || 'SV',
  UNIFIED_CHECKOUT_LOCALE: process.env.UNIFIED_CHECKOUT_LOCALE || 'es_SV',
};
