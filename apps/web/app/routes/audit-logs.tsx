import { useLoaderData } from "react-router"
import type { Route } from "./+types/audit-logs"
import { requireAuth } from "~/services/auth-helpers.server"
import { apiClient } from "~/services/api-client.server"
import {
  Card,
  CardContent,
} from "@checkout-promnet/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@checkout-promnet/ui/components/table"
import { Badge } from "@checkout-promnet/ui/components/badge"

interface AuditLog {
  id: string
  api_key_id: string
  event_type: string
  ip_address: string
  endpoint: string
  http_status: number
  created_at: string
}

interface AuditLogResponse {
  data: AuditLog[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request)
  const url = new URL(request.url)
  const page = url.searchParams.get("page") ?? "1"
  const limit = url.searchParams.get("limit") ?? "50"

  try {
    const result = await apiClient.get<AuditLogResponse>(
      `/audit-logs?page=${page}&limit=${limit}`,
      user,
    )
    return { logs: result.data, total: result.meta.total, page: Number(page), limit: Number(limit), error: null }
  } catch (e) {
    return {
      logs: [],
      total: 0,
      page: 1,
      limit: 50,
      error: e instanceof Error ? e.message : "Error al cargar logs",
    }
  }
}

function statusColor(status: number) {
  if (status >= 200 && status < 300) return "default" as const
  if (status >= 400 && status < 500) return "secondary" as const
  return "destructive" as const
}

export default function AuditLogsPage() {
  const { logs, total, page, limit, error } = useLoaderData<typeof loader>()
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Logs de Auditoría</h1>
        <p className="text-muted-foreground">
          Registro de todas las operaciones realizadas en la API.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay registros de auditoría.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline">{log.event_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-64 truncate">
                      {log.endpoint}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(log.http_status)}>
                        {log.http_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("es")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages} ({total} registros)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/audit-logs?page=${page - 1}&limit=${limit}`}
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Anterior
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/audit-logs?page=${page + 1}&limit=${limit}`}
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Siguiente
                </a>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
