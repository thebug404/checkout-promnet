import { useLoaderData } from "react-router"
import type { Route } from "./+types/sessions"
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

interface Session {
  id: string
  api_key_id: string
  merchant_id: string
  status: string
  callback_url: string | null
  expires_at: string | null
  created_at: string
  cybersource_payment_id: string | null
  cybersource_status: string | null
  merchant?: { id: string; name: string }
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request)
  try {
    const response = await apiClient.get<{ data: Session[] }>("/sessions", user)
    return { sessions: response.data, error: null }
  } catch (e) {
    return {
      sessions: [],
      error: e instanceof Error ? e.message : "Error al cargar sesiones",
    }
  }
}

function statusVariant(status: string) {
  switch (status) {
    case "COMPLETED":
      return "default" as const
    case "CREATED":
      return "secondary" as const
    case "DECLINED":
    case "FAILED":
      return "destructive" as const
    default:
      return "outline" as const
  }
}

export default function SessionsPage() {
  const { sessions, error } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sesiones de Pago</h1>
        <p className="text-muted-foreground">
          Historial de sesiones de Unified Checkout.
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
                <TableHead>ID</TableHead>
                <TableHead>Comercio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead>CS Status</TableHead>
                <TableHead>Expiración</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay sesiones registradas.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs max-w-32 truncate">
                      {s.id}
                    </TableCell>
                    <TableCell>{s.merchant?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.cybersource_payment_id ?? "—"}
                    </TableCell>
                    <TableCell>
                      {s.cybersource_status ? (
                        <Badge variant="outline">{s.cybersource_status}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.expires_at
                        ? new Date(s.expires_at).toLocaleString("es")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("es")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
