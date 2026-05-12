# Déploiement Momentum Server sur le VPS

VPS cible : `51.178.85.130` (déjà host du site Next.js et MySQL).

## Pré-requis sur le VPS

- Node 20.x installé
- PM2 installé (`npm install -g pm2`)
- nginx installé
- certbot installé (`sudo apt install certbot python3-certbot-nginx`)
- Un sous-domaine pointé vers le VPS (ex: `game.tondomaine.fr` → A record vers `51.178.85.130`)

## Première installation

```bash
# Sur le VPS, en root (ou avec sudo)
ssh user@51.178.85.130

# Installer Node 20 si pas déjà
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installer PM2 globalement
sudo npm install -g pm2

# Cloner le repo (ou rsync depuis ta machine)
sudo mkdir -p /var/www/momentum-server
sudo chown $USER:$USER /var/www/momentum-server
git clone <URL_DU_REPO> /var/www/momentum-server
cd /var/www/momentum-server

# Installer les dépendances et compiler
npm ci  # NOTE: postinstall lance prisma generate automatiquement
npm run build  # produit dist/

# Créer .env (NE PAS committer)
cp .env.example .env  # ou créer manuellement
nano .env             # remplir avec les vraies valeurs prod
```

### Variables d'environnement requises dans `.env`

```env
PORT=2567
NODE_ENV=production
DATABASE_URL="mysql://sae501user:PASSWORD@51.178.85.130:3306/sae501"
NEXT_API_URL="https://tondomaine.fr"
GAME_SERVER_SECRET="<openssl rand -base64 32>"
MONITOR_USER="admin"
MONITOR_PASS="<openssl rand -base64 16>"
```

## Démarrer avec PM2

```bash
cd /var/www/momentum-server
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # affiche une commande à exécuter en sudo pour activer au boot
```

Vérifier que le serveur répond :
```bash
curl http://localhost:2567/health
# attendu : {"ok":true}
```

## Configurer nginx

```bash
sudo cp /var/www/momentum-server/deploy/nginx-momentum-game.conf.example /etc/nginx/sites-available/momentum-game

# Éditer pour remplacer game.tondomaine.fr par ton vrai domaine
sudo nano /etc/nginx/sites-available/momentum-game

# Activer
sudo ln -sf /etc/nginx/sites-available/momentum-game /etc/nginx/sites-enabled/

# Tester la conf
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## SSL avec certbot

```bash
sudo certbot --nginx -d game.tondomaine.fr
# certbot modifie automatiquement le fichier nginx pour ajouter SSL
# si tu as déjà mis les blocs SSL manuellement, il les ajustera
```

## Mises à jour ultérieures

```bash
ssh user@51.178.85.130
cd /var/www/momentum-server
git pull
npm ci
npm run build
pm2 restart momentum-server
pm2 logs momentum-server --lines 50
```

## URLs à mettre à jour côté Unity et côté Next.js

### Côté Unity (`Assets/Scripts/Multiplayer/NetworkManager.cs`)

Changer le `serverUrl` par défaut (ou l'override par config) :
```csharp
public string serverUrl = "wss://game.tondomaine.fr";
```

### Côté Next.js (`/Users/elouan/buts4/www/html/SAE501/momentum/.env.production`)

```env
COLYSEUS_HTTP_URL=https://game.tondomaine.fr
```

## Vérification post-déploiement

1. `curl https://game.tondomaine.fr/health` → `{"ok":true}`
2. `curl -u admin:PASS https://game.tondomaine.fr/colyseus` → page HTML monitor (200)
3. `wscat -c wss://game.tondomaine.fr` → handshake OK (utiliser `npm install -g wscat`)
4. Tester via le site : créer une room, ouvrir 2 onglets, jouer une partie complète.
5. `pm2 logs momentum-server` → pas d'erreur pendant 30 min de jeu.

## Logs

- Logs PM2 : `pm2 logs momentum-server`
- Fichiers : `/var/www/momentum-server/logs/{out.log, error.log}`
- nginx : `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

## Rollback

```bash
ssh user@51.178.85.130
cd /var/www/momentum-server
git log --oneline -10  # trouver le commit précédent
git checkout <sha>
npm ci && npm run build && pm2 restart momentum-server
```
