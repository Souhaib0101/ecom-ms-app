# Client Angular Ecom

## Démarrage

Prérequis : Node.js 24.15 ou une version compatible avec Angular 22, et npm.

Depuis `frontend/` :

```sh
npm ci
npm start
```

Ouvrir **http://localhost:4200**. Démarrer le backend dans cet ordre : Discovery,
Config Server, Customer, Inventory, Billing, puis Gateway. Les commandes se trouvent
dans [`requests/configuration.http`](../requests/configuration.http).

Le proxy de développement transfère `/api/**` à `http://localhost:8888` et retire
le préfixe `/api`. Pour changer l'adresse de la gateway, modifier `proxy.conf.json`
puis redémarrer `npm start`. Aucun changement CORS du backend n'est nécessaire.

## Organisation

- `src/app/core` : modèles TypeScript, API HTTP, pagination HAL et messages d'erreur.
- `src/app/shared` : affichage des messages et contrôles de pagination.
- `src/app/pages` : tableau de bord, clients, produits et factures.
- Les formulaires réactifs valident les saisies ; les signaux gèrent l'état des écrans.
- Les prix d'une nouvelle facture sont déterminés par Billing Service. Le total
  affiché avant l'enregistrement est une estimation à partir du catalogue chargé.
- Les sélecteurs de facturation parcourent toutes les pages des API métier.
- Une actualisation retire les sélections de clients ou produits supprimés, tout
  en conservant les quantités saisies et les autres lignes de la facture.
- Le détail d'une facture peut être actualisé ou relancé après une erreur réseau.
- Le filtre de factures suit le paramètre `?client=<id>`, y compris avec les boutons
  précédent/suivant du navigateur. Si le client a été supprimé ou si son service
  est indisponible, sa référence reste sélectionnée ; une actualisation recharge
  les noms sans perdre le filtre.
- Les listes reviennent sur la dernière page disponible si des suppressions
  externes rendent la page courante inaccessible.
- La devise d'affichage est configurée dans `app.config.ts` (`MAD`).

## Vérifications

```sh
npx playwright install chromium
npm run typecheck
npm test
npm run build
```

Les tests standard utilisent des API simulées, sur ordinateur et mobile. Pour
exécuter le parcours navigateur avec les vrais microservices démarrés :

```sh
npm run test:live
```

Le test réel crée un client, un produit et une facture, puis supprime ces données
de test. Les tests utilisent le port 4201 pour leur serveur Angular.

Le workflow `.github/workflows/angular-client.yml` exécute l'installation propre,
les vérifications TypeScript, le build et les tests desktop/mobile à chaque push
ou pull request modifiant le client. Les captures et traces des tests échoués
sont disponibles dans les artefacts du workflow.

## Déploiement

`npm run build` produit les fichiers statiques dans `dist/ecom-client/browser`.
Le proxy Angular est réservé au développement. En production, configurer le serveur
web pour servir l'application, rediriger les routes Angular vers `index.html`, et
transférer `/api/` à la gateway en retirant ce préfixe. Exemple Nginx :

```nginx
location /api/ {
    proxy_pass http://gateway-service:8888/;
}
location / {
    try_files $uri $uri/ /index.html;
}
```
