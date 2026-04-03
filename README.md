## Docker compose

Primero debemos crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```
NODE_ENV="development"

CYBERSOURCE_MERCHANT_ID=""
CYBERSOURCE_KEY_ID=""
CYBERSOURCE_SECRET_KEY=""
```

Ejecutar el comando `docker compose up -d` en la raíz del proyecto para levantar los servicios de la aplicación. Esto iniciará dos aplicativos. La API estara disponible a traves del endpoint `http://localhost:3000` y el cliente a traves de `https://localhost:443`.

Para poder obtener las API Keys por defectos ejecute el siguiente comando: 

```bash
docker compose logs api
```

Le deberia mostrar algo como esto:

```
⏳ Running database seed...

> checkout-promnet@1.0.0 seed
> tsx src/store/seed.ts

✅ Seed completed successfully!

Generated API Keys (save these, they cannot be retrieved later):

Acme Corp: puc_live_ab68f3f6_93f399ce8dea0c1039c6bbf9b3b8e44b1ddc39d7bb5de50ba200911d

MegaStore Inc: puc_live_6e09c2b5_3c966bb6736799e147b851ce4cc471d43cedc7d2fbe8a6ec0642d250
```

Puede hacer uso de estas API Keys para autenticar las solicitudes a la API. Recuerde que estas claves son sensibles y deben ser almacenadas de forma segura. Haga las pruebas a traves de la aplicacion cliente: `https://localhost:443`.
