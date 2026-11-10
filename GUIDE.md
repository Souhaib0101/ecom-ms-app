# Ecom MS App — guide du TP

Application de gestion de facturation construite progressivement avec des microservices.

## Partie 1 : gestion des clients

Le module [customer-service](customer-service/README.md) expose les clients sur
`http://localhost:8081/customers`.

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

## Ressources du cours

- [Vidéo 1 — services métier et infrastructure](https://www.youtube.com/watch?v=kOVHzN8I8e8)
- [Vidéo 2 — facturation et OpenFeign](https://www.youtube.com/watch?v=-iM3J_mgqlM)
- [Vidéo 3 — configuration centralisée](https://www.youtube.com/watch?v=-G2rcLMO1gQ)
- [Dépôt de référence](https://github.com/mohamedYoussfi/micro-services-app)
