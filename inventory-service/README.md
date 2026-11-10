# Inventory Service

Partie 2 du TP : microservice autonome de gestion des produits et de leur stock.

## Démarrage

Depuis la racine du dépôt, avec Maven installé :

```powershell
mvn -f inventory-service/pom.xml spring-boot:run
```

Le wrapper fourni dans le dépôt peut également être utilisé :

```powershell
.\customer-service\mvnw.cmd -f inventory-service/pom.xml spring-boot:run
```

Après `mvn clean verify`, le JAR peut être lancé directement :

```powershell
java -jar inventory-service/target/inventory-service-0.0.1-SNAPSHOT.jar
```

## Modèle et fonctionnement

`Product` contient `id` (Long généré automatiquement), `name`, `price` (double,
comme dans le cours) et `quantity` (entier).
`ProductRepository` hérite de `JpaRepository` et utilise `@RepositoryRestResource`.
Spring Data REST génère l'API CRUD, la pagination, le tri et les liens HAL.
Les ressources utilisent les liens `_links.self.href` comme identifiants REST ;
le champ `id` est masqué par défaut dans les réponses JSON de Spring Data REST.

Un `CommandLineRunner` initialise trois produits :

| Produit | Prix | Quantité |
| --- | ---: | ---: |
| Computer | 4300 | 50 |
| Printer | 1200 | 10 |
| Smartphone | 3200 | 30 |

La base H2 est propre à ce service et réinitialisée à chaque arrêt/redémarrage.

| Méthode | URL | Opération |
| --- | --- | --- |
| GET | `/products` | Liste paginée des produits |
| GET | `/products/{id}` | Consultation d'un produit |
| POST | `/products` | Création d'un produit |
| PUT | `/products/{id}` | Remplacement d'un produit |
| PATCH | `/products/{id}` | Modification partielle, par exemple du stock |
| DELETE | `/products/{id}` | Suppression |
| GET | `/actuator/health` | État du service |

### Exemple PowerShell

```powershell
Invoke-RestMethod http://localhost:8082/products
Invoke-RestMethod 'http://localhost:8082/products?size=2&sort=price,asc'
Invoke-RestMethod http://localhost:8082/products/1

$response = Invoke-WebRequest http://localhost:8082/products -Method Post `
    -ContentType 'application/json' `
    -Body '{"name":"Keyboard","price":199.99,"quantity":25}'
$productUrl = $response.Headers.Location[0]
Invoke-RestMethod $productUrl
Invoke-RestMethod $productUrl -Method Patch -ContentType 'application/json' `
    -Body '{"quantity":20}'
Invoke-RestMethod $productUrl -Method Delete

Invoke-RestMethod http://localhost:8082/actuator/health
```

## Console H2

- URL : <http://localhost:8082/h2-console>
- Driver : `org.h2.Driver`
- JDBC URL : `jdbc:h2:mem:products-db`
- Utilisateur : `sa`
- Mot de passe : vide
- Requête d'exemple : `SELECT * FROM PRODUCT;`

## Vérification

```powershell
mvn -f inventory-service/pom.xml verify
```

Les tests d'intégration couvrent les produits initiaux, les liens HAL,
la pagination et le tri par prix, le cycle CRUD complet avec modification du stock,
les ressources absentes et la santé du service avec la configuration autonome.
