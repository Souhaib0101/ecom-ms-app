# Eureka Discovery Service

```powershell
mvn -f discovery-service/pom.xml spring-boot:run
```

Annuaire disponible sur <http://localhost:8761>. Il conserve les noms et adresses
des instances enregistrées. Le serveur ne s'enregistre pas lui-même et ne cherche
pas un autre registre. Son endpoint de santé est `/actuator/health`.

Démarrer Eureka avant les autres services, puis consulter le tableau de bord
pour vérifier les inscriptions `CUSTOMER-SERVICE`, `INVENTORY-SERVICE` et
`GATEWAY-SERVICE`.
