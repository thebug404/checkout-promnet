import { useLoaderData, Form, Link, useActionData } from "react-router"
import type { Route } from "./+types/merchants"
import { requireAuth } from "~/services/auth-helpers.server"
import { apiClient } from "~/services/api-client.server"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

interface Merchant {
  id: string
  name: string
  country_code: string
  status: string
  created_at: string
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request)
  try {
    const response = await apiClient.get<{ data: Merchant[] }>("/merchants", user)
    return { merchants: response.data, error: null }
  } catch (e) {
    console.error("Error loading merchants:", e)
  
    const message = e instanceof Error ? e.message : "Error al cargar comercios"
    return { merchants: [], error: message }
  }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "create") {
    try {
      await apiClient.post("/merchants", user, {
        name: formData.get("name"),
        country_code: formData.get("country_code"),
      })
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Error al crear comercio" }
    }
  }

  if (intent === "update") {
    const id = formData.get("id")
    try {
      await apiClient.patch(`/merchants/${id}`, user, {
        name: formData.get("name") || undefined,
        status: formData.get("status") || undefined,
      })
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Error al actualizar" }
    }
  }

  if (intent === "delete") {
    const id = formData.get("id")
    try {
      await apiClient.delete(`/merchants/${id}`, user)
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Error al eliminar" }
    }
  }

  return { success: false, error: "Acción no válida" }
}

export default function MerchantsPage() {
  const { merchants, error } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comercios</h1>
          <p className="text-muted-foreground">Gestión de comercios registrados en el sistema.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Nuevo Comercio</Button>
          </DialogTrigger>
          <DialogContent>
            <Form method="post">
              <input type="hidden" name="intent" value="create" />
              <DialogHeader>
                <DialogTitle>Crear Comercio</DialogTitle>
                <DialogDescription>
                  Registra un nuevo comercio en el sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" name="name" placeholder="Acme Corp" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country_code">País</Label>
                  <Select name="country_code" defaultValue="PE">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PE">Perú</SelectItem>
                      <SelectItem value="US">Estados Unidos</SelectItem>
                      <SelectItem value="MX">México</SelectItem>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="CL">Chile</SelectItem>
                      <SelectItem value="BR">Brasil</SelectItem>
                    </SelectContent>
                  </Select>
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
                <TableHead>Nombre</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay comercios registrados.
                  </TableCell>
                </TableRow>
              ) : (
                merchants.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.country_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === "active" ? "default" : "secondary"}>
                        {m.status === "active" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString("es")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/merchants/${m.id}/edit`}>Editar</Link>
                        </Button>
                        {m.status === "active" ? (
                          <Form method="post">
                            <input type="hidden" name="intent" value="update" />
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="status" value="inactive" />
                            <Button variant="ghost" size="sm" type="submit">
                              Desactivar
                            </Button>
                          </Form>
                        ) : (
                          <Form method="post">
                            <input type="hidden" name="intent" value="update" />
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="status" value="active" />
                            <Button variant="ghost" size="sm" type="submit">
                              Activar
                            </Button>
                          </Form>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              Eliminar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>¿Eliminar comercio?</DialogTitle>
                              <DialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente el comercio "{m.name}".
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Form method="post">
                                <input type="hidden" name="intent" value="delete" />
                                <input type="hidden" name="id" value={m.id} />
                                <Button variant="destructive" type="submit">
                                  Eliminar
                                </Button>
                              </Form>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
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
