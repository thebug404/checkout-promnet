import { redirect } from "react-router"
import { getSession, commitSession, type SessionUser } from "./session.server"

export async function requireAuth(request: Request): Promise<SessionUser> {
  const session = await getSession(request.headers.get("Cookie"))
  const user = session.get("user") as SessionUser | undefined

  if (!user) {
    throw redirect("/login")
  }

  return user
}

export async function getOptionalUser(
  request: Request,
): Promise<SessionUser | null> {
  const session = await getSession(request.headers.get("Cookie"))
  return (session.get("user") as SessionUser) ?? null
}

export async function createUserSession(user: SessionUser, redirectTo: string) {
  const session = await getSession()
  session.set("user", user)
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await commitSession(session) },
  })
}
