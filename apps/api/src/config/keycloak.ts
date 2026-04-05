import { environments } from './environments.js';
import { Issuer, type UserinfoResponse } from 'openid-client';

const {
  KEYCLOAK_BASE_URL,
  KEYCLOAK_REALM,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  KEYCLOAK_REDIRECT_URI,
} = environments;

const keycloakIssuer = await Issuer.discover(`${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration`);

const authClient = new keycloakIssuer.Client({
  client_id: KEYCLOAK_CLIENT_ID,
  client_secret: KEYCLOAK_CLIENT_SECRET,
  redirect_uri: KEYCLOAK_REDIRECT_URI,
  response_types: ["code"],
});

export async function getKeycloakUserinfo(accessToken: string): Promise<UserinfoResponse> {
  return authClient.userinfo(accessToken);
}
