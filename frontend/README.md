# Ecom · Client Angular

Interface de gestion commerciale en français pour les microservices Spring Cloud
du projet : tableau de bord, clients, catalogue et factures. Les montants sont
affichés en **dirhams marocains (MAD)**.

## Fonctionnalités

- Tableau de bord alimenté par les API : clients, produits, nombre et montant des
  factures, derniers documents créés.
- Gestion des clients : création, modification, suppression et pagination serveur.
- Catalogue : prix à deux décimales, quantités entières et indicateurs de stock.
- Factures filtrables par client, création multiligne avec validation des doublons,
  détail imprimable et suppression avec confirmation.
- Estimation du total à partir du catalogue ; les prix définitifs sont calculés
  par Billing Service et conservés dans la facture.
- États de chargement, erreurs et relance explicite des opérations échouées.
- Navigation responsive, formulaires étiquetés et page 404.

## Démarrer

Avec Node.js **24.15+** et npm, depuis ce dossier :

```sh
npm ci
npm start
```

Ouvrir **http://localhost:4200**. La gateway doit écouter sur
**http://localhost:8888**. Le proxy Angular transmet les requêtes `/api/` aux
microservices par cette gateway.

Pour démarrer les services Java, suivre les commandes de
[`requests/configuration.http`](../requests/configuration.http), dans l'ordre :
Discovery, Config Server, Customer, Inventory, Billing, Gateway.

## Vérifier le client

```sh
npx playwright install chromium
npm run typecheck
npm run build
npm test
```

Les tests navigateur couvrent les parcours métier, les erreurs réseau et les
écrans desktop/mobile avec des API simulées. Ils démarrent leur propre serveur
Angular sur le port **4201** ; les microservices ne sont pas nécessaires.

Avec tous les microservices démarrés, `npm run test:live` vérifie le parcours réel
client → produit → facture à travers le proxy et supprime les données de test.

Les mêmes vérifications avec API simulées sont exécutées par le workflow GitHub
Actions **Angular client**.

## Structure et déploiement

Les détails de l'architecture, de la configuration de la gateway et du déploiement
des fichiers statiques se trouvent dans [`DEVELOPMENT.md`](DEVELOPMENT.md).

- `/` : vue d'ensemble.
- `/clients` : clients.
- `/produits` : catalogue.
- `/factures` : factures, filtre `?client=<id>`.
- `/factures/nouvelle` : création d'une facture.
- `/factures/:id` : détail et impression.
