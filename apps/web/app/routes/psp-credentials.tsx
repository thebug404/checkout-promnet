import { useLoaderData, Form, Link, useActionData } from "react-router"
import type { Route } from "./+types/psp-credentials"
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

interface PspCredential {
  id: string
  merchant_id: string
  psp_name: string
  credential_ref: string | null
  cybersource_merchant_id: string | null
  cybersource_key_id: string | null
  cybersource_secret_key: string | null
  is_active: boolean
  created_at: string
  merchant?: { id: string; name: string }
}

interface Merchant {
  id: string
  name: string
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request)
  try {
    const merchantsRes = await apiClient.get<{ data: Merchant[] }>("/merchants", user)
    const credResults = await Promise.all(
      merchantsRes.data.map((m) =>
        apiClient.get<{ data: PspCredential[] }>(`/merchants/${m.id}/psp-credentials`, user).catch(() => ({ data: [] as PspCredential[] }))
      )
    )
    const credentials = credResults.flatMap((r) => r.data)
    return { credentials, merchants: merchantsRes.data, error: null }
  } catch (e) {
    return {
      credentials: [],
      merchants: [],
      error: e instanceof Error ? e.message : "Error al cargar credenciales",
    }
  }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "create") {
    const merchantId = formData.get("merchant_id") as string
    try {
      await apiClient.post(`/merchants/${merchantId}/psp-credentials`, user, {
        psp_name: formData.get("psp_name"),
        cybersource_merchant_id: formData.get("cybersource_merchant_id") || undefined,
        cybersource_key_id: formData.get("cybersource_key_id") || undefined,
        cybersource_secret_key: formData.get("cybersource_secret_key") || undefined,
      })
      return { success: true, error: null }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al crear credencial",
      }
    }
  }

  if (intent === "toggle") {
    const id = formData.get("id")
    const is_active = formData.get("is_active") === "true"
    const merchantId = formData.get("merchant_id") as string
    try {
      await apiClient.patch(`/merchants/${merchantId}/psp-credentials/${id}`, user, {
        is_active: !is_active,
      })
      return { success: true, error: null }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al actualizar",
      }
    }
  }

  if (intent === "delete") {
    const id = formData.get("id")
    const merchantId = formData.get("merchant_id") as string
    try {
      await apiClient.delete(`/merchants/${merchantId}/psp-credentials/${id}`, user)
      return { success: true, error: null }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al eliminar",
      }
    }
  }

  return { success: false, error: "Acción no válida" }
}

export default function PspCredentialsPage() {
  const { credentials, merchants, error } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const merchantNameById = new Map(merchants.map((merchant) => [merchant.id, merchant.name]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credenciales PSP</h1>
          <p className="text-muted-foreground">
            Credenciales de proveedores de procesamiento de pagos.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Nueva Credencial</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <Form method="post">
              <input type="hidden" name="intent" value="create" />
              <DialogHeader>
                <DialogTitle>Crear Credencial PSP</DialogTitle>
                <DialogDescription>
                  Registra credenciales de un procesador de pagos para un comercio.
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
                  <Label htmlFor="psp_name">Proveedor</Label>
                  <Select name="psp_name" defaultValue="cybersource">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cybersource">CyberSource</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cybersource_merchant_id">CyberSource Merchant ID</Label>
                  <Input
                    id="cybersource_merchant_id"
                    name="cybersource_merchant_id"
                    placeholder="your_merchant_id"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cybersource_key_id">CyberSource Key ID</Label>
                  <Input
                    id="cybersource_key_id"
                    name="cybersource_key_id"
                    placeholder="your_key_id"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cybersource_secret_key">CyberSource Secret Key</Label>
                  <Input
                    id="cybersource_secret_key"
                    name="cybersource_secret_key"
                    type="password"
                    placeholder="your_secret_key"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Crear</Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {actionData?.success && (
        <div className="rounded-lg border border-primary/50 bg-primary/10 p-3 text-sm text-primary">
          Operación realizada exitosamente
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
                <TableHead>Comercio</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Merchant ID</TableHead>
                <TableHead>Key ID</TableHead>
                <TableHead>Secret</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No hay credenciales registradas.
                  </TableCell>
                </TableRow>
              ) : (
                credentials.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.merchant?.name ?? merchantNameById.get(c.merchant_id) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.psp_name}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.cybersource_merchant_id ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.cybersource_key_id ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.cybersource_secret_key ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "default" : "secondary"}>
                        {c.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("es")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/psp-credentials/${c.id}/edit`}>Editar</Link>
                        </Button>
                        <Form method="post">
                          <input type="hidden" name="intent" value="toggle" />
                          <input type="hidden" name="id" value={c.id} />
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              Eliminar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>¿Eliminar credencial PSP?</DialogTitle>
                              <DialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente la credencial de {c.psp_name} para el comercio.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Form method="post">
                                <input type="hidden" name="intent" value="delete" />
                                <input type="hidden" name="id" value={c.id} />
                                <input type="hidden" name="merchant_id" value={c.merchant_id} />
                                <Button variant="destructive" type="submit">
                                  Eliminar
                                </Button>
                              </Form>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                          <input type="hidden" name="is_active" value={String(c.is_active)} />
                          <input type="hidden" name="merchant_id" value={c.merchant_id} />
                          <Button variant="ghost" size="sm" type="submit">
                            {c.is_active ? "Desactivar" : "Activar"}
                          </Button>
                        </Form>
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
