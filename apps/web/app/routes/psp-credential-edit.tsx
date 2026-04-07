import { Form, Link, redirect, useActionData, useLoaderData } from "react-router"
import type { Route } from "./+types/psp-credential-edit"
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

async function findCredentialById(user: Awaited<ReturnType<typeof requireAuth>>, credentialId: string) {
  const merchantsRes = await apiClient.get<{ data: Merchant[] }>("/merchants", user)

  const credentialsByMerchant = await Promise.all(
    merchantsRes.data.map(async (merchant) => {
      const response = await apiClient.get<{ data: PspCredential[] }>(
        `/merchants/${merchant.id}/psp-credentials`,
        user,
      )

      return response.data
    }),
  )

  const credentials = credentialsByMerchant.flat()
  const credential = credentials.find((item) => item.id === credentialId) ?? null

  return { credential, merchants: merchantsRes.data }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth(request)
  const pspCredentialId = params.pspCredentialId

  if (!pspCredentialId) {
    throw redirect("/psp-credentials")
  }

  try {
    const result = await findCredentialById(user, pspCredentialId)
    return { credential: result.credential, merchants: result.merchants, error: null }
  } catch (e) {
    return {
      credential: null,
      merchants: [],
      error: e instanceof Error ? e.message : "Error al cargar credencial",
    }
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth(request)
  const pspCredentialId = params.pspCredentialId

  if (!pspCredentialId) {
    return { success: false, error: "Credencial PSP no encontrada" }
  }

  const formData = await request.formData()
  const merchantId = formData.get("merchant_id") as string

  if (!merchantId) {
    return { success: false, error: "Comercio no válido para la credencial" }
  }

  const cybersourceSecretKey = ((formData.get("cybersource_secret_key") as string) ?? "").trim()

  try {
    await apiClient.patch(`/merchants/${merchantId}/psp-credentials/${pspCredentialId}`, user, {
      credential_ref: formData.get("credential_ref") || undefined,
      is_active: formData.get("is_active") === "true",
      cybersource_merchant_id: formData.get("cybersource_merchant_id") || undefined,
      cybersource_key_id: formData.get("cybersource_key_id") || undefined,
      cybersource_secret_key: cybersourceSecretKey || undefined,
    })

    return redirect("/psp-credentials")
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al actualizar credencial PSP",
    }
  }
}

export default function PspCredentialEditPage() {
  const { credential, merchants, error } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Credencial PSP</h1>
          <p className="text-muted-foreground">
            Modifica la configuración de una credencial de proveedor de pagos.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/psp-credentials">Volver</Link>
        </Button>
      </div>

      {(error || actionData?.error) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error || actionData?.error}
        </div>
      )}

      {credential ? (
        <Card>
          <CardHeader>
            <CardTitle>{credential.psp_name}</CardTitle>
            <CardDescription>
              Comercio: {credential.merchant?.name ?? merchants.find((m) => m.id === credential.merchant_id)?.name ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="grid gap-4">
              <input type="hidden" name="merchant_id" value={credential.merchant_id} />

              <div className="grid gap-2">
                <Label htmlFor="credential_ref">Referencia de credencial</Label>
                <Input
                  id="credential_ref"
                  name="credential_ref"
                  defaultValue={credential.credential_ref ?? ""}
                  placeholder="cred_checkout_main"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cybersource_merchant_id">CyberSource Merchant ID</Label>
                <Input
                  id="cybersource_merchant_id"
                  name="cybersource_merchant_id"
                  defaultValue={credential.cybersource_merchant_id ?? ""}
                  placeholder="your_merchant_id"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cybersource_key_id">CyberSource Key ID</Label>
                <Input
                  id="cybersource_key_id"
                  name="cybersource_key_id"
                  defaultValue={credential.cybersource_key_id ?? ""}
                  placeholder="your_key_id"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cybersource_secret_key">CyberSource Secret Key</Label>
                <Input
                  id="cybersource_secret_key"
                  name="cybersource_secret_key"
                  type="password"
                  placeholder="Dejar vacío para mantener el valor actual"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="is_active">Estado</Label>
                <Select name="is_active" defaultValue={credential.is_active ? "true" : "false"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activa</SelectItem>
                    <SelectItem value="false">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link to="/psp-credentials">Cancelar</Link>
                </Button>
                <Button type="submit">Guardar cambios</Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No se encontró la credencial PSP solicitada.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
