# La Pépite de l'Enfer (Édition Leboncoin)

Party game web multijoueur (Next.js + Tailwind v4 + Zustand + WebSocket).

## Démarrer

```bash
npm install
npm run dev
```

Ouvre ensuite `http://localhost:3000`.

## Jouer à plusieurs (LAN)

1. Lance le serveur sur un PC du réseau Wi-Fi.
2. Depuis les téléphones, ouvre `http://IP_DU_PC:3000` (même Wi-Fi).
3. Un joueur crée une partie (code 6 caractères), les autres rejoignent.

## Gameplay

- Le créateur règle le timer (5 à 10 minutes) et lance une manche.
- L’app génère des critères aléatoires (prix, km, puissance, année) avec tolérance ±10%.
- Chaque joueur colle une URL Leboncoin et clique “Terminer”.
- La manche se coupe si tout le monde a terminé avant la fin.
- À la fin, l’analyse est simulée (extraction déterministe depuis l’URL) puis scoring par proximité.
- Après 3 manches: classement final.

## Multijoueur en ligne (Internet)

Le serveur utilise des WebSockets, donc il faut un hébergeur qui supporte les connexions persistantes (évite Vercel pour ce projet).

Option recommandée: Fly.io (simple, stable pour WebSockets).

1. Crée un compte Fly.io et installe `flyctl`.
2. Dans ce dossier:
   - `fly launch` (choisis une app name, region proche)
   - Quand Fly demande un port, garde `3000` (le Dockerfile expose `3000`).
3. Déploie:
   - `fly deploy`
4. Partage l’URL publique Fly avec tes amis.

Option Render / Railway:
- Crée un nouveau “Web Service” depuis ton repo Git (Dockerfile détecté).
- Assure-toi que la commande de démarrage est `node server.mjs`.

Notes:
- Les rooms sont en mémoire: si le serveur redémarre, les parties en cours disparaissent.
- Pour scaler multi-instances (plusieurs serveurs), il faudrait stocker l’état (Redis) et gérer l’affinité de session.

### OVH (VPS / Public Cloud) avec Docker (recommandé)

Pré-requis: un VPS OVH (Ubuntu 22.04 ou Debian 12) + un nom de domaine (optionnel mais recommandé).

1. Sur OVH: récupère l’IP du serveur et ouvre le firewall (au minimum `22`, `80`, `443`).
2. DNS: pointe ton domaine vers l’IP (enregistrements `A` / `AAAA`).
3. SSH sur le serveur puis installe Docker + Compose.
4. Déploie depuis le repo:

```bash
git clone https://github.com/Foossa730/La-Pepite-de-l-enfer.git
cd La-Pepite-de-l-enfer

# Edite Caddyfile et remplace pepite.example.com par ton domaine

docker compose up -d --build
```

Le reverse-proxy (Caddy) gère HTTPS automatiquement et supporte WebSockets.
