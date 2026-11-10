# Customer Service

Partie 1 du TP : microservice autonome de gestion des clients.

## Démarrage

Depuis la racine du dépôt :

```powershell
.\customer-service\mvnw.cmd -f customer-service/pom.xml spring-boot:run
```

Avec Maven installé :

```powershell
mvn -f customer-service/pom.xml spring-boot:run
```

Après `mvn clean verify`, le JAR peut aussi être lancé directement :

```powershell
java -jar customer-service/target/customer-service-0.0.1-SNAPSHOT.jar
```

## Modèle et fonctionnement

`Customer` contient `id` (Long généré automatiquement), `name` et `email`.
`CustomerRepository` hérite de `JpaRepository` et utilise `@RepositoryRestResource`.
Spring Data REST génère l'API CRUD, la pagination, le tri et les liens HAL.
Les ressources utilisent les liens `_links.self.href` comme identifiants REST ;
Spring Data REST masque par défaut le champ `id` dans le JSON, comme dans le cours.

Un `CommandLineRunner` initialise trois clients : Mohamed, Imane et Yassine.
La base étant en mémoire, elle est réinitialisée à chaque arrêt/redémarrage.

| Méthode | URL | Opération |
| --- | --- | --- |
| GET | `/customers` | Liste paginée des clients |
| GET | `/customers/{id}` | Consultation d'un client |
| POST | `/customers` | Création d'un client |
| PUT | `/customers/{id}` | Remplacement d'un client |
| PATCH | `/customers/{id}` | Modification partielle |
| DELETE | `/customers/{id}` | Suppression |
| GET | `/actuator/health` | État du service |

### Exemple PowerShell

```powershell
Invoke-RestMethod http://localhost:8081/customers
Invoke-RestMethod 'http://localhost:8081/customers?size=2&sort=name,asc'
Invoke-RestMethod http://localhost:8081/customers/1

$response = Invoke-WebRequest http://localhost:8081/customers -Method Post `
    -ContentType 'application/json' `
    -Body '{"name":"Sara","email":"sara@example.com"}'
$customerUrl = $response.Headers.Location[0]
Invoke-RestMethod $customerUrl
Invoke-RestMethod $customerUrl -Method Patch -ContentType 'application/json' `
    -Body '{"email":"sara.updated@example.com"}'
Invoke-RestMethod $customerUrl -Method Delete

Invoke-RestMethod http://localhost:8081/actuator/health
```

## Console H2

- URL : <http://localhost:8081/h2-console>
- Driver : `org.h2.Driver`
- JDBC URL : `jdbc:h2:mem:customers-db`
- Utilisateur : `sa`
- Mot de passe : vide
- Requête d'exemple : `SELECT * FROM CUSTOMER;`

## Vérification

```powershell
mvn -f customer-service/pom.xml verify
```

Les tests d'intégration vérifient les données initiales, les liens HAL,
la pagination et le tri, le cycle CRUD complet, les ressources absentes et la santé
du service avec la configuration autonome.
