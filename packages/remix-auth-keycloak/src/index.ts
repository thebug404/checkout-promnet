import { Strategy } from "remix-auth/strategy";
import {
  OAuth2Strategy,
  OAuth2RequestError,
  UnexpectedErrorResponseBodyError,
  UnexpectedResponseError,
} from "remix-auth-oauth2";

type OAuth2Tokens = OAuth2Strategy.VerifyOptions["tokens"];
type OAuth2CookieOption = OAuth2Strategy.ConstructorOptions["cookie"];
type OAuth2CodeChallengeMethod = OAuth2Strategy.ConstructorOptions["codeChallengeMethod"];
type URLInput = string | URL;

const DEFAULT_SCOPES = ["openid", "profile", "email"];

export { OAuth2RequestError, UnexpectedErrorResponseBodyError, UnexpectedResponseError };

export interface KeycloakProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  [claim: string]: unknown;
}

export interface KeycloakEndpoints {
  authorizationEndpoint: URL;
  tokenEndpoint: URL;
  tokenRevocationEndpoint: URL;
  userInfoEndpoint: URL;
}

export function createKeycloakEndpoints(issuer: URLInput): KeycloakEndpoints {
  const issuerURL = ensureTrailingSlash(asURL(issuer));

  return {
    authorizationEndpoint: new URL("protocol/openid-connect/auth", issuerURL),
    tokenEndpoint: new URL("protocol/openid-connect/token", issuerURL),
    tokenRevocationEndpoint: new URL("protocol/openid-connect/revoke", issuerURL),
    userInfoEndpoint: new URL("protocol/openid-connect/userinfo", issuerURL),
  };
}

interface OAuth2Payload {
  request: Request;
  tokens: OAuth2Tokens;
}

export namespace KeycloakStrategy {
  export interface ConstructorOptions {
    issuer: URLInput;
    clientId: string;
    clientSecret: string | null;
    redirectURI: URLInput;
    cookie?: OAuth2CookieOption;
    scopes?: string[];
    codeChallengeMethod?: OAuth2CodeChallengeMethod;
    audience?: string | string[];
    authorizationEndpoint?: URLInput;
    tokenEndpoint?: URLInput;
    tokenRevocationEndpoint?: URLInput;
    userInfoEndpoint?: URLInput;
  }

  export interface VerifyOptions<Profile extends KeycloakProfile = KeycloakProfile> {
    request: Request;
    tokens: OAuth2Tokens;
    profile: Profile;
    accessToken: string;
    refreshToken: string | null;
    idToken: string | null;
  }
}

export class KeycloakStrategy<
  User,
  Profile extends KeycloakProfile = KeycloakProfile,
> extends Strategy<User, KeycloakStrategy.VerifyOptions<Profile>> {
  override name = "keycloak";

  protected readonly options: KeycloakStrategy.ConstructorOptions;
  protected readonly userInfoEndpoint: URL;

  private readonly oauth2: OAuth2Strategy<OAuth2Payload>;

  constructor(
    options: KeycloakStrategy.ConstructorOptions,
    verify: Strategy.VerifyFunction<User, KeycloakStrategy.VerifyOptions<Profile>>,
  ) {
    super(verify);
    this.options = options;

    const defaults = createKeycloakEndpoints(options.issuer);
    this.userInfoEndpoint = asURL(options.userInfoEndpoint ?? defaults.userInfoEndpoint);

    this.oauth2 = new OAuth2Strategy<OAuth2Payload>(
      {
        cookie: options.cookie,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        redirectURI: options.redirectURI,
        authorizationEndpoint: options.authorizationEndpoint ?? defaults.authorizationEndpoint,
        tokenEndpoint: options.tokenEndpoint ?? defaults.tokenEndpoint,
        tokenRevocationEndpoint:
          options.tokenRevocationEndpoint ?? defaults.tokenRevocationEndpoint,
        scopes: options.scopes ?? DEFAULT_SCOPES,
        codeChallengeMethod: options.codeChallengeMethod,
        audience: options.audience,
      },
      async ({ request, tokens }) => ({ request, tokens }),
    );
  }

  override async authenticate(request: Request): Promise<User> {
    const { request: authRequest, tokens } = await this.oauth2.authenticate(request);
    const profile = await this.userProfile(tokens);

    return this.verify({
      request: authRequest,
      tokens,
      profile,
      accessToken: tokens.accessToken(),
      refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
      idToken: getIdToken(tokens),
    });
  }

  public refreshToken(refreshToken: string) {
    return this.oauth2.refreshToken(refreshToken);
  }

  public revokeToken(token: string) {
    return this.oauth2.revokeToken(token);
  }

  protected async userProfile(tokens: OAuth2Tokens): Promise<Profile> {
    const response = await fetch(this.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to fetch Keycloak user profile (${response.status} ${response.statusText}): ${body}`,
      );
    }

    return (await response.json()) as Profile;
  }
}

function asURL(value: URLInput): URL {
  return value instanceof URL ? new URL(value.toString()) : new URL(value);
}

function ensureTrailingSlash(value: URL): URL {
  if (value.pathname.endsWith("/")) {
    return value;
  }

  const url = new URL(value.toString());
  url.pathname = `${url.pathname}/`;
  return url;
}

function getIdToken(tokens: OAuth2Tokens): string | null {
  const candidates = tokens as OAuth2Tokens & {
    hasIdToken?: () => boolean;
    idToken?: () => string;
    hasIDToken?: () => boolean;
    IDToken?: () => string;
  };

  if (typeof candidates.hasIdToken === "function" && typeof candidates.idToken === "function") {
    return candidates.hasIdToken() ? candidates.idToken() : null;
  }

  if (typeof candidates.hasIDToken === "function" && typeof candidates.IDToken === "function") {
    return candidates.hasIDToken() ? candidates.IDToken() : null;
  }

  return null;
}
