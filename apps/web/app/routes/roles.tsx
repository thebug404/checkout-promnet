import { useLoaderData } from "react-router"
import type { Route } from "./+types/roles"
import { requireAuth } from "~/services/auth-helpers.server"
import { apiClient } from "~/services/api-client.server"
import {
  Card,
  CardContent,
  CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@checkout-promnet/ui/components/tabs"

interface Permission {
  id: string
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request)
  try {
    const [rolesRes, permissionsRes] = await Promise.all([
      apiClient.get<{ data: Role[] }>("/roles", user),
      apiClient.get<{ data: Permission[] }>("/roles/permissions/all", user),
    ])
    return { roles: rolesRes.data, permissions: permissionsRes.data, error: null }
  } catch (e) {
    return {
      roles: [],
      permissions: [],
      error: e instanceof Error ? e.message : "Error al cargar roles",
    }
  }
}

export default function RolesPage() {
  const { roles, permissions, error } = useLoaderData<typeof loader>()

  // Group permissions by resource
  const grouped = permissions.reduce(
    (acc, p) => {
      if (!acc[p.resource]) acc[p.resource] = []
      acc[p.resource].push(p)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles y Permisos</h1>
        <p className="text-muted-foreground">
          Configuración de roles y permisos del sistema.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge>{role.name}</Badge>
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-2">Permisos ({role.permissions.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-xs">
                        {p.resource}:{p.action}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(grouped).map(([resource, perms]) =>
                    perms.map((p, i) => (
                      <TableRow key={p.id}>
                        {i === 0 ? (
                          <TableCell rowSpan={perms.length} className="font-medium align-top">
                            <Badge variant="outline">{resource}</Badge>
                          </TableCell>
                        ) : null}
                        <TableCell>{p.action}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-48 truncate">
                          {p.id}
                        </TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
