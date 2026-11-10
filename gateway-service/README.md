# Gateway Service

Point d'entrée HTTP de l'application sur le port **8888**, avec Spring Cloud Gateway WebFlux.

```powershell
mvn -f gateway-service/pom.xml spring-boot:run
```

Les routes statiques transmettent `/customers/**` à `http://localhost:8081`
et `/products/**` à `http://localhost:8082`, en conservant chemin, paramètres,
méthode HTTP et corps de requête. Les collections `/customers` et `/products`
sont également accessibles.

Les destinations sont personnalisables via `CUSTOMER_SERVICE_URL` et
`INVENTORY_SERVICE_URL`. L'état du service est disponible sur `/actuator/health`.

```powershell
Invoke-RestMethod http://localhost:8888/customers
Invoke-RestMethod http://localhost:8888/products
mvn -f gateway-service/pom.xml verify
```
