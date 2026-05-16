# Momentum — Game Server

Serveur multijoueur temps réel pour **Momentum**, un jeu de parkour en duo. Bâti sur [Colyseus](https://www.colyseus.io/), gère la matchmaking, l'état partagé entre les deux clients, et la persistance des scores.

## Démo

[![Momentum — Démo gameplay](https://img.youtube.com/vi/bgXhLfmgvyg/maxresdefault.jpg)](https://youtu.be/bgXhLfmgvyg)

## Architecture

Momentum est composé de trois dépôts :

| Composant | Rôle | Repo |
|---|---|---|
| **Game Server** (ce repo) | Colyseus + Prisma · matchmaking, état partagé, scores | — |
| **Site web** | Next.js · lobby, partage de code, classement, héberge le build WebGL | [Hokoala/site-momentum](https://github.com/Hokoala/site-momentum) |
| **Jeu Unity** | Unity 2022.3 WebGL · gameplay | [AloneDay-91/unity-ws501-momentum-v2](https://github.com/AloneDay-91/unity-ws501-momentum-v2) |

Les trois partagent la même base MySQL via Prisma (modèles `GameSession` + `Score`).

## Stack

- Node.js 20 · TypeScript · Colyseus 0.17
- Express (API REST légère pour le monitor) · WebSocket transport
- Prisma 6 (client MySQL)

## Démarrage local

```bash
npm install
cp .env.example .env  # remplir DATABASE_URL
npm run dev           # tsx watch sur src/index.ts → http://localhost:2567
```

Endpoints :
- `ws://localhost:2567` — connexion Colyseus pour les clients Unity
- `http://localhost:2567/monitor` — dashboard Colyseus (basic auth)
- `http://localhost:2567/playground` — playground Colyseus (dev only)

## Build & déploiement

### Build local
```bash
npm run build   # tsc → dist/
npm start       # node dist/index.js
```

### Image Docker (production)

Un workflow GitHub Actions pousse automatiquement l'image vers GHCR à chaque push sur `main`.

```bash
docker pull ghcr.io/<owner>/momentum-server:latest
docker run -p 2567:2567 -e DATABASE_URL=... ghcr.io/<owner>/momentum-server:latest
```

Déploiement géré par [Dokploy](https://dokploy.com/) — il suit le tag `latest` et redéploie à chaque nouveau push.

### Variables d'env

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne MySQL Prisma (partagée avec le site Next.js) |
| `PORT` | Port Colyseus (défaut: `2567`) |
| `CORS_ORIGINS` | Origines autorisées, séparées par virgules (`*` par défaut) |
| `MONITOR_USER` / `MONITOR_PASS` | Basic auth pour `/monitor` |

## Structure

```
src/
├── index.ts             # entrée Colyseus + Express
├── config.ts            # TICK_RATE_HZ, MAX_CLIENTS_PER_ROOM, etc.
├── rooms/
│   └── MomentumRoom.ts  # state machine waiting → loading → countdown → playing → finished
├── schema/
│   ├── GameState.ts     # @colyseus/schema racine
│   └── PlayerState.ts   # état par joueur (position, vélocité, animation, score)
├── auth/
│   └── verifyGameSession.ts  # valide token contre la DB avant onJoin
└── db/
    ├── prisma.ts
    └── persistScores.ts   # écrit le statut "finished" en fin de partie
```

## Tests

```bash
npm test   # vitest
```
