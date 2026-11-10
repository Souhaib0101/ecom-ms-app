# Gateway Service

Point d'entrée HTTP de l'application sur le port **8888**, avec Spring Cloud Gateway WebFlux.

```powershell
mvn -f gateway-service/pom.xml spring-boot:run
```

Par défaut, le routage est dynamique via Eureka :

- `/customer-service/customers` et `/customer-service/customers/{id}`
- `/inventory-service/products` et `/inventory-service/products/{id}`

Le locator découvre les instances, retire le préfixe du nom de service et utilise
le load balancer Spring Cloud. Les identifiants de service dans les URL sont en
minuscules. Démarrer Eureka, les services métier et la Gateway, puis attendre leur
enregistrement dans l'annuaire.

Pour reproduire la configuration statique, activer le profil `static` :

```powershell
mvn -f gateway-service/pom.xml spring-boot:run '-Dspring-boot.run.profiles=static'
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
