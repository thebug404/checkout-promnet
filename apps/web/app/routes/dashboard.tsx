import { useLoaderData } from "react-router"
import type { Route } from "./+types/dashboard"
import { requireAuth } from "~/services/auth-helpers.server"
import { apiClient } from "~/services/api-client.server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@checkout-promnet/ui/components/card"

interface DashboardData {
  merchants: { total: number }
  apiKeys: { total: number }
  sessions: { total: number }
  auditLogs: { total: number }
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request)

  let data: DashboardData = {
    merchants: { total: 0 },
    apiKeys: { total: 0 },
    sessions: { total: 0 },
    auditLogs: { total: 0 },
  }

  try {
    const [merchants, apiKeys, sessions, auditLogs] = await Promise.allSettled([
      apiClient.get<{ data: unknown[] }>("/merchants", user),
      apiClient.get<{ data: unknown[] }>("/api-keys", user),
      apiClient.get<{ data: unknown[] }>("/sessions", user),
      apiClient.get<{ data: unknown[]; meta: { total: number } }>("/audit-logs?limit=1", user),
    ])

    if (merchants.status === "fulfilled") data.merchants.total = merchants.value.data.length
    if (apiKeys.status === "fulfilled") data.apiKeys.total = apiKeys.value.data.length
    if (sessions.status === "fulfilled") data.sessions.total = sessions.value.data.length
    if (auditLogs.status === "fulfilled") data.auditLogs.total = auditLogs.value.meta.total
  } catch {
    // API may not be available yet
  }

  return { data }
}

const stats = [
  { key: "merchants", title: "Comercios", description: "Comercios registrados" },
  { key: "apiKeys", title: "API Keys", description: "Claves de acceso activas" },
  { key: "sessions", title: "Sesiones", description: "Sesiones de pago creadas" },
  { key: "auditLogs", title: "Registros", description: "Eventos de auditoría" },
] as const

export default function DashboardPage() {
  const { data } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general del sistema de pagos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.key}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.description}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {data[stat.key].total}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
