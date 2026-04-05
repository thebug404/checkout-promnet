# remix-auth-keycloak

Estrategia de Keycloak para `remix-auth`, implementada sobre `remix-auth-oauth2`.

## Uso

```ts
import { Authenticator } from "remix-auth";
import { KeycloakStrategy } from "remix-auth-keycloak";

type User = {
  id: string;
  email: string;
};

const authenticator = new Authenticator<User>();

authenticator.use(
  new KeycloakStrategy<User>(
    {
      issuer: "https://auth.example.com/realms/my-realm",
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || null,
      redirectURI: "https://app.example.com/auth/callback",
      scopes: ["openid", "profile", "email"],
    },
    async ({ profile, accessToken, refreshToken }) => {
      return {
        id: profile.sub,
        email: profile.email,
        accessToken,
        refreshToken,
      } as unknown as User;
    },
  ),
  "keycloak",
);
```

## Notas

- Si no especificas endpoints manuales, se calculan automáticamente desde `issuer` usando rutas estándar de Keycloak OIDC.
- Puedes sobrescribir `authorizationEndpoint`, `tokenEndpoint`, `tokenRevocationEndpoint` y `userInfoEndpoint` si tu despliegue lo requiere.
- El callback de `verify` recibe `tokens` de OAuth2, `profile` de userinfo y accesos directos (`accessToken`, `refreshToken`, `idToken`).
