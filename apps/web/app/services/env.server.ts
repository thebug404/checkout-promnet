export const env = {
  KEYCLOAK_BASE_URL: process.env.KEYCLOAK_BASE_URL || "http://localhost:8080",
  KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || "checkout-promnet",
  KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || "web-admin",
  KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "s3cr3t-d3v-0nly-ch4ng3-1n-pr0d",
  API_BASE_URL: process.env.API_BASE_URL || "http://localhost:3000",
  APP_URL: process.env.APP_URL || "http://localhost:5173",
}

export function getKeycloakUrls() {
  const base = `${env.KEYCLOAK_BASE_URL}/realms/${env.KEYCLOAK_REALM}`
  return {
    issuer: base,
    authorizationEndpoint: `${base}/protocol/openid-connect/auth`,
    tokenEndpoint: `${base}/protocol/openid-connect/token`,
    userinfoEndpoint: `${base}/protocol/openid-connect/userinfo`,
    endSessionEndpoint: `${base}/protocol/openid-connect/logout`,
    jwksUri: `${base}/protocol/openid-connect/certs`,
  }
}
