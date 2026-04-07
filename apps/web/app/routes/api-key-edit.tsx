import { Form, Link, redirect, useActionData, useLoaderData } from "react-router"
import type { Route } from "./+types/api-key-edit"
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
import { Textarea } from "@checkout-promnet/ui/components/textarea"

interface ApiKey {
  id: string
  key_prefix: string
  allowed_origins: string[]
  ip_whitelist: string[]
  expires_at: string | null
  is_active: boolean
  merchant?: { id: string; name: string }
  role?: { id: string; name: string }
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth(request)
  const apiKeyId = params.apiKeyId

  if (!apiKeyId) {
    throw redirect("/api-keys")
  }

  const url = new URL(request.url)
  const merchantId = url.searchParams.get("merchantId")

  if (!merchantId) {
    throw redirect("/api-keys")
  }

  try {
    const result = await apiClient.get<{ data: ApiKey }>(`/merchants/${merchantId}/api-keys/${apiKeyId}`, user)
    return { apiKey: result.data, merchantId, error: null }
  } catch (e) {
    return {
      apiKey: null,
      merchantId,
      error: e instanceof Error ? e.message : "Error al cargar API Key",
    }
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth(request)
  const apiKeyId = params.apiKeyId

  if (!apiKeyId) {
    return { success: false, error: "API Key no encontrada" }
  }

  const formData = await request.formData()
  const merchantId = formData.get("merchantId") as string

  if (!merchantId) {
    return { success: false, error: "Merchant no encontrado" }
  }

  const originsRaw = ((formData.get("allowed_origins") as string) ?? "").trim()
  const ipRaw = ((formData.get("ip_whitelist") as string) ?? "").trim()
  const expiresAtRaw = ((formData.get("expires_at") as string) ?? "").trim()

  try {
    await apiClient.patch(`/merchants/${merchantId}/api-keys/${apiKeyId}`, user, {
      allowed_origins: originsRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      ip_whitelist: ipRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : undefined,
    })

    return redirect("/dashboard?notice=api-key-updated")
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al actualizar API Key",
    }
  }
}

export default function ApiKeyEditPage() {
  const { apiKey, merchantId, error } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar API Key</h1>
          <p className="text-muted-foreground">
            Actualiza restricciones y expiración de la clave.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/api-keys">Volver</Link>
        </Button>
      </div>

      {(error || actionData?.error) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error || actionData?.error}
        </div>
      )}

      {apiKey ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-base">puc_live_{apiKey.key_prefix}_***</CardTitle>
            <CardDescription>
              Comercio: {apiKey.merchant?.name ?? "—"} · Rol: {apiKey.role?.name ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="grid gap-4">
              <input type="hidden" name="merchantId" value={merchantId} />
              <div className="grid gap-2">
                <Label htmlFor="allowed_origins">Orígenes Permitidos</Label>
                <Textarea
                  id="allowed_origins"
                  name="allowed_origins"
                  defaultValue={apiKey.allowed_origins.join("\n")}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Un origen por línea</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ip_whitelist">Whitelist de IPs</Label>
                <Textarea
                  id="ip_whitelist"
                  name="ip_whitelist"
                  defaultValue={apiKey.ip_whitelist.join("\n")}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Una IP por línea</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expires_at">Expiración</Label>
                <Input
                  id="expires_at"
                  name="expires_at"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(apiKey.expires_at)}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link to="/api-keys">Cancelar</Link>
                </Button>
                <Button type="submit">Guardar cambios</Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No se pudo cargar la API Key seleccionada.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
