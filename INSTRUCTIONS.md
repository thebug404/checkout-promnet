Genera una RESTful API utilizando Node.js y [Hono](https://hono.dev/), un framework web minimalista y rápido.

Esta API tiene como proposito generar sesiones de pago haciendo uso de Unified Checkout de Cybersource, una plataforma de pagos que permite a los comerciantes aceptar pagos en línea de manera segura y eficiente.

Antes de armar el plan de trabajo, es importante que leas los siguientes documentos para entender mejor el contexto y los requisitos del proyecto:

- [Cybersource Unified Checkout Documentation](/docs/unified-checkout.pdf): Este documento contiene todo lo que necesitas saber sobre cómo funciona Unified Checkout, sus características, y cómo integrarlo en tu aplicación.
- [Diagrama de arquitectura](/docs/diagram-checkout.md): Este documento contiene un diagrama que muestra la arquitectura general de la aplicación, incluyendo los componentes principales y cómo interactúan entre sí.

## Consideraciones

- Dado que es un proyecto de prueba, no es necesario implementar una base de datos. Puedes almacenar los datos en un archivo JSON para simular la persistencia.
- Asegúrate de manejar los errores de manera adecuada y proporcionar respuestas claras y útiles a los clientes de la API.
- Dado que este proyecto trabajara bajo la modalidad **Merchant of Record** este sera un facilitador para procesar transacciones de N comercios, por lo que no es necesario implementar funcionalidades específicas para cada comercio, sino que la API debe ser lo suficientemente flexible para manejar diferentes tipos de transacciones y configuraciones.
- Como la generacion de estas sesiones se hara via API Key, estas deben tener aspectos, tales como: allowed_origins, ip_whitelist, is_active, expires_at, last_used_at, comercio que pertenece, que tipo de rol tiene, etc. Para modelar todo esto te paso un link que puedes tomar como base: [/assets/puc_apikey_erd.html](/assets/puc_apikey_erd.html). Para el caso de environment omitelo, ya que se tendran ambientes separados algo como sandbox.domain.com y production.domain.com.

## Request de sesion

### Basico

```json
{
   "clientVersion":"0.34",
   "targetOrigins":[
      "https://localhost:8181"
   ],
   "allowedCardNetworks":[
      "VISA",
      "MASTERCARD",
      "AMEX"
   ],
   "allowedPaymentTypes":[
      "APPLEPAY",
      "CHECK",
      "CLICKTOPAY",
      "GOOGLEPAY",
      "PANENTRY",
      "PAZE"
   ],
   "country":"US",
   "locale":"en_US",
   "captureMandate":{
      "billingType":"FULL",
      "requestEmail":true,
      "requestPhone":true,
      "requestShipping":true,
      "shipToCountries":[
         "US",
         "GB"
      ],
      "showAcceptedNetworkIcons":true
   },
   "completeMandate":{
      "type":"PREFER_AUTH",
      "decisionManager":true,
      "consumerAuthentication":true
   },
   "data":{
      "orderInformation":{
         "amountDetails":{
            "totalAmount":"21.00",
            "currency":"USD"
         }
      }
   }
}
```

### Avanzado

```json
{
  "targetOrigins" : [ "https://localhost:8080" ],
  "clientVersion" : "0.19",
  "allowedCardNetworks" : [ "VISA", "MASTERCARD", "AMEX", "DISCOVER", "JCB", "DINERSCLUB"],
  "allowedPaymentTypes" : ["CLICKTOPAY", "GOOGLEPAY"],
  "country" : "US",
  "locale" : "en_US",
  "captureMandate" : {
    "billingType" : "FULL",
    "requestEmail" : true,
    "requestPhone" : true,
    "requestShipping" : true,
    "shipToCountries" : [ "US", "GB" ],
    "showAcceptedNetworkIcons" : true
  },
  "orderInformation" : {
    "amountDetails" : {
      "totalAmount" : "21.00",
      "currency" : "USD"
    },
    "billTo" : {
      "address1" : "123 Cool Street",
      "administrativeArea" : "NY",
      "buildingNumber" : "12",
      "country" : "US",
      "district" : "district",
      "locality" : "New York",
      "postalCode" : "10172",
      "email" : "foo@bar.com",
      "firstName" : "Viktor",
      "lastName" : "Vaughn",
      "middleName" : "F",
      "nameSuffix" : "Jr",
      "title" : "Mr",
      "phoneNumber" : "1234567890",
      "phoneType" : "mobile"
    },
    "shipTo" : {
      "address1" : "456 Nice Avenue",
      "administrativeArea" : "CA",
      "buildingNumber" : "409",
      "country" : "US",
      "district" : "Uptown",
      "locality" : "Los Angeles",
      "postalCode" : "90010",
      "firstName" : "Alan",
      "lastName" : "Turing"
    }
  }
}
```

En la documentacion de Cybersource Unified Checkout puedes encontrar una descripción detallada de cada uno de los campos que se pueden incluir en la solicitud de generación de sesión, así como ejemplos adicionales y casos de uso específicos. Asegúrate de revisar esta documentación para comprender completamente cómo funciona la API y cómo puedes aprovechar al máximo sus funcionalidades.

## Documentacion

Al finalizar el desarrollo de esta API, es importante que me generes las lista de endpoints disponibles, con sus headers, body, response, methods, y una breve descripción de cada uno. Esto me ayudara a entender mejor cómo interactuar con la API y qué funcionalidades ofrece. Asegúrate de incluir toda la información relevante para cada endpoint, como los parámetros de entrada, los posibles códigos de respuesta, y cualquier otra información que consideres importante para los usuarios de la API.
