import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),

  layout("routes/admin-layout.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("merchants", "routes/merchants.tsx"),
    route("merchants/:merchantId/edit", "routes/merchant-edit.tsx"),
    route("api-keys", "routes/api-keys.tsx"),
    route("api-keys/:apiKeyId/edit", "routes/api-key-edit.tsx"),
    route("psp-credentials", "routes/psp-credentials.tsx"),
    route("psp-credentials/:pspCredentialId/edit", "routes/psp-credential-edit.tsx"),
    route("sessions", "routes/sessions.tsx"),
    route("roles", "routes/roles.tsx"),
    route("audit-logs", "routes/audit-logs.tsx"),
  ]),
] satisfies RouteConfig
