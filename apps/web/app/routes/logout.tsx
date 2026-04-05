import type { Route } from "./+types/logout"
import { redirect } from "react-router"
import { getSession, destroySession } from "~/services/session.server"
import { getKeycloakUrls, env } from "~/services/env.server"

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"))
  const keycloakUrls = getKeycloakUrls()

  const logoutUrl = new URL(keycloakUrls.endSessionEndpoint)
  logoutUrl.searchParams.set("client_id", env.KEYCLOAK_CLIENT_ID)
  logoutUrl.searchParams.set("post_logout_redirect_uri", `${env.APP_URL}/login`)

  return redirect(logoutUrl.toString(), {
    headers: { "Set-Cookie": await destroySession(session) },
  })
}
