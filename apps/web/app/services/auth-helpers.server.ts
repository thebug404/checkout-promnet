import { redirect } from "react-router"
import {
  getSession,
  commitSession,
  destroySession,
  type SessionUser,
} from "./session.server"
import { getKeycloakUrls } from "./env.server"
import { keycloakStrategy } from "./auth.server"

/**
 * Decode the JWT payload to check the `exp` claim.
 * Returns true if the token is expired or will expire within 30 seconds.
 */
function isTokenExpired(accessToken: string): boolean {
  try {
    const parts = accessToken.split(".")
    if (parts.length !== 3) return true
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(atob(base64))
    return (
      typeof payload.exp === "number" &&
      payload.exp * 1000 <= Date.now() + 30_000
    )
  } catch {
    return true
  }
}

/**
 * Validate the access token against Keycloak's userinfo endpoint (source of truth).
 * Returns true if valid, false if rejected, or "network_error" if Keycloak is unreachable.
 */
async function isTokenValidAtKeycloak(
  accessToken: string,
): Promise<boolean | "network_error"> {
  try {
    const { userinfoEndpoint } = getKeycloakUrls()
    const response = await fetch(userinfoEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return response.ok
  } catch {
    return "network_error"
  }
}

/**
 * Attempt to obtain new tokens using the refresh token.
 */
async function tryRefreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const tokens = await keycloakStrategy.refreshToken(refreshToken)
    return {
      accessToken: tokens.accessToken(),
      refreshToken: tokens.hasRefreshToken()
        ? tokens.refreshToken()
        : refreshToken,
    }
  } catch {
    return null
  }
}

/**
 * Try to refresh the session and redirect-to-self to commit the new cookie.
 * Returns null if refresh fails.
 */
async function attemptRefreshAndRedirect(
  request: Request,
  session: Awaited<ReturnType<typeof getSession>>,
  user: SessionUser,
): Promise<never | null> {
  if (!user.refreshToken) return null

  const newTokens = await tryRefreshTokens(user.refreshToken)
  if (!newTokens) return null

  const updatedUser: SessionUser = {
    ...user,
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
  }
  session.set("user", updatedUser)

  const url = new URL(request.url)
  throw redirect(url.pathname + url.search, {
    headers: { "Set-Cookie": await commitSession(session) },
  })
}

export async function requireAuth(request: Request): Promise<SessionUser> {
  const session = await getSession(request.headers.get("Cookie"))
  const user = session.get("user") as SessionUser | undefined

  if (!user) {
    throw redirect("/login")
  }

  const expired = isTokenExpired(user.accessToken)

  if (!expired) {
    // Token not locally expired — validate against Keycloak
    const valid = await isTokenValidAtKeycloak(user.accessToken)
    if (valid === true) return user
    // If Keycloak is unreachable, trust the local token to avoid locking users out
    if (valid === "network_error") return user
    // valid === false → Keycloak rejected the token (revoked / session ended)
  }

  // Token expired or rejected by Keycloak — try refresh
  await attemptRefreshAndRedirect(request, session, user)

  // Refresh failed — destroy session
  throw redirect("/login", {
    headers: { "Set-Cookie": await destroySession(session) },
  })
}

export async function getOptionalUser(
  request: Request,
): Promise<SessionUser | null> {
  const session = await getSession(request.headers.get("Cookie"))
  const user = session.get("user") as SessionUser | undefined

  if (!user) return null

  const expired = isTokenExpired(user.accessToken)

  if (!expired) {
    const valid = await isTokenValidAtKeycloak(user.accessToken)
    if (valid === true) return user
    if (valid === "network_error") return user
  }

  // Try refresh
  await attemptRefreshAndRedirect(request, session, user)

  // Refresh failed — destroy stale cookie
  throw redirect(new URL(request.url).pathname, {
    headers: { "Set-Cookie": await destroySession(session) },
  })
}

export async function createUserSession(user: SessionUser, redirectTo: string) {
  const session = await getSession()
  session.set("user", user)
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await commitSession(session) },
  })
}
