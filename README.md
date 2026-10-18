# Géorama sur locaweb.ch

Site statique : le jeu Géorama, déjà compilé dans `dist/` (source : dépôt dejongwouter09/Sint2).
Vercel publie `dist/` tel quel, sans installation ni compilation.

Mettre à jour : recompiler Sint2 (`npm run build`), copier son dossier `dist/` ici, pousser sur `main`.
L'ancien site reste dans l'historique Git.

## Jeu de société en ligne

Les téléphones parlent à la Table par `api/send` et `api/poll` (fonctions Vercel), qui gardent les messages
de chaque salle (code de 4 lettres dans l'adresse, `?room=ABCD`) dans **Upstash Redis** pendant 6 heures.
Variables Vercel : `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
Sans elles, le quiz marche mais le jeu de société en ligne non (on peut toujours jouer avec `python3 jouer.py`).
Chaque téléphone fait environ une demande toutes les 0,7 s.
