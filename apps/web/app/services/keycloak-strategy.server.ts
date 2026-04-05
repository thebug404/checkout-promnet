import { Strategy } from "remix-auth/strategy"
import { redirect } from "react-router"

export namespace KeycloakStrategy {
  export interface ConstructorOptions {
    issuer: string
    authorizationEndpoint: string
    tokenEndpoint: string
    userinfoEndpoint: string
    clientId: string
    clientSecret: string
    callbackURL: string
    scope?: string
  }

  export interface VerifyOptions {
    accessToken: string
    refreshToken: string
    idToken: string
    profile: KeycloakProfile
  }
}

export interface KeycloakProfile {
  sub: string
  email: string
  email_verified: boolean
  preferred_username: string
  given_name?: string
  family_name?: string
  name?: string
  realm_access?: { roles: string[] }
  resource_access?: Record<string, { roles: string[] }>
}

export class KeycloakStrategy<User> extends Strategy<
  User,
  KeycloakStrategy.VerifyOptions
> {
  name = "keycloak"

  constructor(
    protected options: KeycloakStrategy.ConstructorOptions,
    verify: Strategy.VerifyFunction<User, KeycloakStrategy.VerifyOptions>,
  ) {
    super(verify)
  }

  async authenticate(request: Request): Promise<User> {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")

    // If no code, redirect to Keycloak authorization endpoint
    if (!code) {
      const state = crypto.randomUUID()
      const authUrl = new URL(this.options.authorizationEndpoint)
      authUrl.searchParams.set("client_id", this.options.clientId)
      authUrl.searchParams.set("redirect_uri", this.options.callbackURL)
      authUrl.searchParams.set("response_type", "code")
      authUrl.searchParams.set("scope", this.options.scope ?? "openid profile email")
      authUrl.searchParams.set("state", state)

      throw redirect(authUrl.toString())
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(this.options.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        code,
        redirect_uri: this.options.callbackURL,
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      throw new Error(`Token exchange failed: ${errorBody}`)
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string
      refresh_token: string
      id_token: string
      expires_in: number
      token_type: string
    }

    // Fetch user profile
    const profileResponse = await fetch(this.options.userinfoEndpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch user profile from Keycloak")
    }

    const profile = (await profileResponse.json()) as KeycloakProfile

    // Call the verify function
    return await this.verify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      profile,
    })
  }
}
