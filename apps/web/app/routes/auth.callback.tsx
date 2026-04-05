import type { Route } from "./+types/auth.callback"
import { authenticator } from "~/services/auth.server"
import { getSession, commitSession } from "~/services/session.server"
import { redirect } from "react-router"

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const user = await authenticator.authenticate("keycloak", request)
    const session = await getSession(request.headers.get("Cookie"))
    session.set("user", user)
    return redirect("/dashboard", {
      headers: { "Set-Cookie": await commitSession(session) },
    })
  } catch (error) {
    if (error instanceof Response) throw error
    console.error("Auth callback error:", error)
    return redirect("/login")
  }
}
