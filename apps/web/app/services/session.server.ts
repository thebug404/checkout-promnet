import { createCookieSessionStorage } from "react-router"
import { env } from "./env.server"

export interface SessionUser {
  id: string
  email: string
  name: string
  preferredUsername: string
  accessToken: string
  refreshToken: string
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
  },
})

export const { getSession, commitSession, destroySession } = sessionStorage
