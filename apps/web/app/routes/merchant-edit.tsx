import { Form, Link, redirect, useActionData, useLoaderData } from "react-router"
import type { Route } from "./+types/merchant-edit"
import { requireAuth } from "~/services/auth-helpers.server"
import { apiClient } from "~/services/api-client.server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@checkout-promnet/ui/components/card"
import { Button } from "@checkout-promnet/ui/components/button"
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

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth(request)
  const merchantId = params.merchantId

  if (!merchantId) {
    throw redirect("/merchants")
  }

  try {
    const response = await apiClient.get<{ data: Merchant }>(`/merchants/${merchantId}`, user)
    return { merchant: response.data, error: null }
  } catch (e) {
    return {
      merchant: null,
      error: e instanceof Error ? e.message : "Error al cargar comercio",
    }
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth(request)
  const merchantId = params.merchantId

  if (!merchantId) {
    return { success: false, error: "Comercio no encontrado" }
  }

  const formData = await request.formData()

  try {
    await apiClient.patch(`/merchants/${merchantId}`, user, {
      name: formData.get("name") || undefined,
      country_code: formData.get("country_code") || undefined,
      status: formData.get("status") || undefined,
    })

    return redirect("/merchants")
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al actualizar comercio",
    }
  }
}

export default function MerchantEditPage() {
  const { merchant, error } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Comercio</h1>
          <p className="text-muted-foreground">Actualiza la información del comercio.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/merchants">Volver</Link>
        </Button>
      </div>

      {(error || actionData?.error) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error || actionData?.error}
        </div>
      )}

      {merchant ? (
        <Card>
          <CardHeader>
            <CardTitle>{merchant.name}</CardTitle>
            <CardDescription>ID: {merchant.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" defaultValue={merchant.name} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="country_code">País</Label>
                <Select name="country_code" defaultValue={merchant.country_code}>
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

              <div className="grid gap-2">
                <Label htmlFor="status">Estado</Label>
                <Select name="status" defaultValue={merchant.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link to="/merchants">Cancelar</Link>
                </Button>
                <Button type="submit">Guardar cambios</Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No se pudo cargar el comercio solicitado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
