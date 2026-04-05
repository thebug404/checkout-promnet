import { Authenticator } from "remix-auth"
import { KeycloakStrategy } from "remix-auth-keycloak"
import { env } from "./env.server"
import type { SessionUser } from "./session.server"

export const keycloakStrategy = new KeycloakStrategy<SessionUser>(
  {
    issuer: `${env.KEYCLOAK_BASE_URL}/realms/${env.KEYCLOAK_REALM}`,
    clientId: env.KEYCLOAK_CLIENT_ID,
    clientSecret: env.KEYCLOAK_CLIENT_SECRET || null,
    redirectURI: `${env.APP_URL}/auth/callback`,
    scopes: ["openid", "profile", "email"],
  },
  async ({ accessToken, refreshToken, profile }) => {
    return {
      id: profile.sub,
      email: profile.email ?? "",
      name: profile.name ?? profile.preferred_username ?? "",
      preferredUsername: profile.preferred_username ?? "",
      accessToken,
      refreshToken: refreshToken ?? "",
    }
  },
)

export const authenticator = new Authenticator<SessionUser>()
authenticator.use(keycloakStrategy, "keycloak")
