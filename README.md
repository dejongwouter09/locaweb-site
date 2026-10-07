# Bloc Club — locaweb.ch

Jeu de blocs 3D original pour navigateur PC. ZQSD/WASD pour bouger, souris pour regarder, espace pour sauter, clic gauche pour casser, clic droit pour poser, 1–7 pour choisir un matériau, Entrée pour discuter et Échap pour ouvrir le menu.

## Vercel

Le dépôt remplace l'ancien site Locaweb. `vercel.json` configure `npm run build` et publie `dist`. Aucun fichier PHP ni serveur WebSocket permanent n'est déployé sur Vercel.

Si le projet Vercel est déjà connecté à la branche `main`, un push déclenche normalement un déploiement. Vérifier dans les réglages : racine du projet = racine du dépôt, Framework = Other et pas de commande de build ou de dossier de sortie ancien qui remplacerait `vercel.json`. Le domaine existant locaweb.ch reste rattaché au projet ; ne pas modifier les DNS si cette liaison fonctionne déjà.

Sans Redis, le site fonctionne **en solo** et conserve les changements dans le stockage local du navigateur. Le mode est indiqué à l'écran. Changer de navigateur ou effacer les données du site ne conserve pas cette sauvegarde.

## Activer le multijoueur Vercel

1. Dans Vercel, installer/connecter **Upstash Redis** depuis le Marketplace au projet de ce dépôt.
2. Vérifier les variables de production `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` (les noms `KV_REST_API_URL` / `KV_REST_API_TOKEN` sont également acceptés). Le jeton doit être celui de lecture **et écriture**, jamais un jeton read-only. Entrer les valeurs uniquement dans les paramètres sécurisés de Vercel, pas dans Git.
3. Redéployer. Ouvrir le domaine dans deux navigateurs, vérifier que l'écran affiche le nombre de joueurs en ligne, puis tester blocs et chat.

Les joueurs partagent un monde sauvegardé dans Redis, jusqu'à 12 connexions. Le serveur utilise des mises à jour HTTP environ deux fois par seconde. Chaque mise à jour fait une commande Redis EVAL : la consommation dépend du nombre de joueurs et de la durée des sessions. Choisir un quota adapté pour des sessions longues. Les mondes de production et de preview sont séparés par défaut. `BLOC_WORLD_KEY` est une variable facultative pour choisir explicitement la clé de stockage ; ne pas partager une même clé entre preview et production.

La connexion d'un onglet inactif expire au bout de 30 secondes ; recharger la page. Sans comptes ni modération, cette version est destinée à un groupe de confiance. Le monde solo n'est pas importé automatiquement dans le monde partagé.

## Développement local

Node.js 24 :

```sh
npm ci
npm start
```

Le serveur local écoute sur le port 3000, utilise WebSocket et sauvegarde son monde dans `data/world.json`. La version Vercel utilise `/api/game` et Redis ; elle ne partage pas la sauvegarde locale Node.

## Vérifications

```sh
npm test
npm run build
```

Ces commandes vérifient le serveur local, le mode solo/API et la génération des fichiers Vercel. Pour le multijoueur serverless avec Redis réel, Docker est requis :

```sh
npm run test:redis
```

Les tests Redis utilisent un conteneur temporaire sans port public et ne modifient pas le monde de production. Le rendu et les contrôles doivent aussi être vérifiés dans un navigateur.

## Retour à l'ancien site

Le dernier commit de l'ancien site est `1e42d19`. Son contenu reste dans l'historique Git. Restaurer les fichiers depuis ce commit dans un nouveau commit si nécessaire ; ne pas forcer l'historique de la branche.
