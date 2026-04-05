import { redirect } from "react-router"
import type { Route } from "./+types/login"
import { authenticator } from "~/services/auth.server"
import { getSession, commitSession } from "~/services/session.server"
import { getOptionalUser } from "~/services/auth-helpers.server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getOptionalUser(request)

  console.log("Loader user:", user) // Debug log

  if (user) throw redirect("/dashboard")
  return null
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const user = await authenticator.authenticate("keycloak", request)
    const session = await getSession(request.headers.get("Cookie"))
    session.set("user", user)
    return redirect("/dashboard", {
      headers: { "Set-Cookie": await commitSession(session) },
    })
  } catch (error) {
    if (error instanceof Response) throw error
    throw error
  }
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Checkout Promnet</h1>
          <p className="text-sm text-muted-foreground text-center">
            Panel de administración para la gestión de comercios y pagos
          </p>
        </div>
        <form method="post" className="w-full">
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Iniciar sesión con Keycloak
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          Serás redirigido al proveedor de identidad para autenticarte.
        </p>
      </div>
    </div>
  )
}
