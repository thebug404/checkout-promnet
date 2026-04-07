import { useLoaderData, Form, Link, useActionData } from "react-router"
import type { Route } from "./+types/api-keys"
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
import { Button } from "@checkout-promnet/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@checkout-promnet/ui/components/dialog"
import { Input } from "@checkout-promnet/ui/components/input"
import { Label } from "@checkout-promnet/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@checkout-promnet/ui/components/select"
import { Textarea } from "@checkout-promnet/ui/components/textarea"

interface ApiKey {
  id: string
  merchant_id: string
  role_id: string
  key_prefix: string
  allowed_origins: string[]
  ip_whitelist: string[]
  is_active: boolean
  expires_at: string | null
  last_used_at: string | null
  created_at: string
  created_by: string
  merchant?: { id: string; name: string }
  role?: { id: string; name: string }
}

interface Role {
  id: string
  name: string
  description: string
}

interface Merchant {
  id: string
  name: string
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request)
  try {
    const [rolesRes, merchantsRes] = await Promise.all([
      apiClient.get<{ data: Role[] }>("/roles", user),
      apiClient.get<{ data: Merchant[] }>("/merchants", user),
    ])
    const apiKeyResults = await Promise.all(
      merchantsRes.data.map((m) =>
        apiClient.get<{ data: ApiKey[] }>(`/merchants/${m.id}/api-keys`, user).catch(() => ({ data: [] as ApiKey[] }))
      )
    )
    const apiKeys = apiKeyResults.flatMap((r) => r.data)
    return { apiKeys, roles: rolesRes.data, merchants: merchantsRes.data, error: null }
  } catch (e) {
    return {
      apiKeys: [],
      roles: [],
      merchants: [],
      error: e instanceof Error ? e.message : "Error al cargar datos",
    }
  }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "create") {
    const originsRaw = (formData.get("allowed_origins") as string) || ""
    const ipRaw = (formData.get("ip_whitelist") as string) || ""
    const merchantId = formData.get("merchant_id") as string
    try {
      const result = await apiClient.post<{ data: ApiKey; key: string; warning: string }>(`/merchants/${merchantId}/api-keys`, user, {
        role_id: formData.get("role_id"),
        allowed_origins: originsRaw
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        ip_whitelist: ipRaw
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        expires_at: formData.get("expires_at") || undefined,
      })
      return { success: true, rawKey: result.key, error: null }
    } catch (e) {
      return { success: false, rawKey: null, error: e instanceof Error ? e.message : "Error al crear API Key" }
    }
  }

  if (intent === "revoke") {
    const id = formData.get("id")
    const merchantId = formData.get("merchant_id") as string
    try {
      await apiClient.post(`/merchants/${merchantId}/api-keys/${id}/revoke`, user)
      return { success: true, rawKey: null, error: null }
    } catch (e) {
      return { success: false, rawKey: null, error: e instanceof Error ? e.message : "Error al revocar" }
    }
  }

  return { success: false, rawKey: null, error: "Acción no válida" }
}

export default function ApiKeysPage() {
  const { apiKeys, roles, merchants, error } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Gestión de claves de acceso para la API.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Nueva API Key</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <Form method="post">
              <input type="hidden" name="intent" value="create" />
              <DialogHeader>
                <DialogTitle>Crear API Key</DialogTitle>
                <DialogDescription>
                  Genera una nueva clave de acceso para un comercio.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="merchant_id">Comercio</Label>
                  <Select name="merchant_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar comercio" />
                    </SelectTrigger>
                    <SelectContent>
                      {merchants.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role_id">Rol</Label>
                  <Select name="role_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} — {r.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="allowed_origins">Orígenes Permitidos</Label>
                  <Textarea
                    id="allowed_origins"
                    name="allowed_origins"
                    placeholder={"https://example.com\nhttps://app.example.com"}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Un origen por línea</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ip_whitelist">Whitelist de IPs</Label>
                  <Textarea
                    id="ip_whitelist"
                    name="ip_whitelist"
                    placeholder={"192.168.1.1\n10.0.0.1"}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">Una IP por línea (opcional)</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expires_at">Expiración</Label>
                  <Input id="expires_at" name="expires_at" type="datetime-local" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Crear</Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {actionData?.rawKey && (
        <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
          <p className="text-sm font-medium mb-2">API Key creada exitosamente. Cópiala ahora, no se mostrará otra vez:</p>
          <code className="block rounded bg-muted p-3 text-sm font-mono break-all select-all">
            {actionData.rawKey}
          </code>
        </div>
      )}

      {(error || actionData?.error) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error || actionData?.error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prefijo</TableHead>
                <TableHead>Comercio</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Expiración</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay API Keys registradas.
                  </TableCell>
                </TableRow>
              ) : (
                apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono text-sm">
                      puc_live_{key.key_prefix}_***
                    </TableCell>
                    <TableCell>{key.merchant?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{key.role?.name ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Activa" : "Revocada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.expires_at
                        ? new Date(key.expires_at).toLocaleDateString("es")
                        : "Sin expiración"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleString("es")
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/api-keys/${key.id}/edit?merchantId=${key.merchant_id}`}>Editar</Link>
                        </Button>
                        {key.is_active && (
                          <Form method="post">
                            <input type="hidden" name="intent" value="revoke" />
                            <input type="hidden" name="id" value={key.id} />
                            <input type="hidden" name="merchant_id" value={key.merchant_id} />
                            <Button variant="ghost" size="sm" type="submit">
                              Revocar
                            </Button>
                          </Form>
                        )}
                      </div>
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
