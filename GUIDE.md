# Ecom MS App — guide du TP

Application de gestion de facturation construite progressivement avec des microservices.

## Parties réalisées

| Partie | Module | API | Base de données |
| --- | --- | --- | --- |
| 1 | [customer-service](customer-service/README.md) | <http://localhost:8081/customers> | `jdbc:h2:mem:customers-db` |
| 2 | [inventory-service](inventory-service/README.md) | <http://localhost:8082/products> | `jdbc:h2:mem:products-db` |

Les deux services proposent les opérations CRUD (GET, POST, PUT, PATCH et DELETE),
la pagination, le tri et des données de démonstration chargées au démarrage.

### Technologies

- Java 21 ou supérieur (compilation ciblée Java 21)
- Maven 3.9.9 (wrapper inclus dans `customer-service`)
- Spring Boot 3.5.7 et Spring Cloud 2025.0.0
- Spring Web, Spring Data JPA, Spring Data REST, H2, Lombok et Actuator

Chaque service dispose de sa propre base H2 en mémoire. Les dépendances clientes
Eureka et Config sont présentes comme dans le cours ; leur activation est désactivée
dans la configuration locale à cette étape.

### Compilation et tests

Depuis la racine du dépôt :

```powershell
mvn clean verify
```

Sans Maven installé, sous Windows :

```powershell
.\customer-service\mvnw.cmd -f pom.xml clean verify
```

Sous Linux/macOS :

```bash
sh customer-service/mvnw -f pom.xml clean verify
```

Le POM racine agrège les modules ; chaque microservice reste un projet Spring Boot
autonome, exécutable depuis son propre POM.

### Démarrage des deux services

Ouvrir deux terminaux à la racine du dépôt :

```powershell
# Terminal 1
mvn -f customer-service/pom.xml spring-boot:run
```

```powershell
# Terminal 2
mvn -f inventory-service/pom.xml spring-boot:run
```

Sans Maven installé, remplacer `mvn` par `.\customer-service\mvnw.cmd`.
Dans IntelliJ IDEA, importer le `pom.xml` racine, puis exécuter
`CustomerServiceApplication` et `InventoryServiceApplication`.

### Vérifications rapides

```powershell
Invoke-RestMethod http://localhost:8081/customers
Invoke-RestMethod http://localhost:8082/products
Invoke-RestMethod http://localhost:8081/actuator/health
Invoke-RestMethod http://localhost:8082/actuator/health
```

Les réponses des listes sont au format HAL : les données se trouvent dans
`_embedded.customers` ou `_embedded.products`, avec les liens `_links` et les
informations de pagination `page`.

Les consoles H2 sont accessibles sur `/h2-console` pour chaque service.
Utiliser l'URL JDBC propre au service, l'utilisateur `sa` et un mot de passe vide.

Les deux suites d'intégration totalisent 10 tests : données initiales et liens HAL,
pagination/tri, cycle CRUD complet, réponses 404 et santé de chaque service.

## Ressources du cours

- [Vidéo 1 — services métier et infrastructure](https://www.youtube.com/watch?v=kOVHzN8I8e8)
- [Vidéo 2 — facturation et OpenFeign](https://www.youtube.com/watch?v=-iM3J_mgqlM)
- [Vidéo 3 — configuration centralisée](https://www.youtube.com/watch?v=-G2rcLMO1gQ)
- [Dépôt de référence](https://github.com/mohamedYoussfi/micro-services-app)
