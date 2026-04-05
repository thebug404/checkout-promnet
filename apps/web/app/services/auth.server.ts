import { Authenticator } from "remix-auth"
import { KeycloakStrategy } from "./keycloak-strategy.server"
import { env, getKeycloakUrls } from "./env.server"
import type { SessionUser } from "./session.server"

export const authenticator = new Authenticator<SessionUser>()

const keycloakUrls = getKeycloakUrls()

authenticator.use(
  new KeycloakStrategy<SessionUser>(
    {
      issuer: keycloakUrls.issuer,
      authorizationEndpoint: keycloakUrls.authorizationEndpoint,
      tokenEndpoint: keycloakUrls.tokenEndpoint,
      userinfoEndpoint: keycloakUrls.userinfoEndpoint,
      clientId: env.KEYCLOAK_CLIENT_ID,
      clientSecret: env.KEYCLOAK_CLIENT_SECRET,
      callbackURL: `${env.APP_URL}/auth/callback`,
      scope: "openid profile email",
    },
    async ({ accessToken, refreshToken, profile }) => {
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.name ?? profile.preferred_username,
        preferredUsername: profile.preferred_username,
        accessToken,
        refreshToken,
      }
    },
  ),
  "keycloak",
)
