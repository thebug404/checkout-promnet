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
  const url = new URL(request.url)
  const notice = url.searchParams.get("notice")

  let data: DashboardData = {
    merchants: { total: 0 },
    apiKeys: { total: 0 },
    sessions: { total: 0 },
    auditLogs: { total: 0 },
  }

  try {
    const merchantsRes = await apiClient.get<{ data: { id: string }[] }>("/merchants", user).catch(() => ({ data: [] as { id: string }[] }))
    data.merchants.total = merchantsRes.data.length

    const perMerchant = await Promise.all(
      merchantsRes.data.map(async (m) => {
        const [ak, s, al] = await Promise.allSettled([
          apiClient.get<{ data: unknown[] }>(`/merchants/${m.id}/api-keys`, user),
          apiClient.get<{ data: unknown[] }>(`/merchants/${m.id}/sessions`, user),
          apiClient.get<{ data: unknown[]; meta: { total: number } }>(`/merchants/${m.id}/audit-logs?limit=1`, user),
        ])
        return {
          apiKeys: ak.status === "fulfilled" ? ak.value.data.length : 0,
          sessions: s.status === "fulfilled" ? s.value.data.length : 0,
          auditLogs: al.status === "fulfilled" ? al.value.meta.total : 0,
        }
      })
    )

    for (const pm of perMerchant) {
      data.apiKeys.total += pm.apiKeys
      data.sessions.total += pm.sessions
      data.auditLogs.total += pm.auditLogs
    }
  } catch {
    // API may not be available yet
  }

  return {
    data,
    notice: notice === "api-key-updated" ? "API Key actualizada correctamente." : null,
  }
}

const stats = [
  { key: "merchants", title: "Comercios", description: "Comercios registrados" },
  { key: "apiKeys", title: "API Keys", description: "Claves de acceso activas" },
  { key: "sessions", title: "Sesiones", description: "Sesiones de pago creadas" },
  { key: "auditLogs", title: "Registros", description: "Eventos de auditoría" },
] as const

export default function DashboardPage() {
  const { data, notice } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}
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
