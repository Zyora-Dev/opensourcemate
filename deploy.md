# OpenSourceMate — Production Deploy Guide

> Live: **https://opensourcemate.in** · API: **https://api.opensourcemate.in**
> Server: DigitalOcean droplet · `168.144.66.122` · Ubuntu 24.04 · root user
> SSL: **Cloudflare Flexible** (orange-cloud proxy on, origin is HTTP-only)

---

## 1. Architecture

```
Cloudflare (HTTPS, orange proxy)
        │
        ▼  HTTP :80
┌──────────────────────────────────┐
│  Nginx  (reverse proxy)          │
│  • opensourcemate.in     → :3000 │
│  • api.opensourcemate.in → :8000 │
└──────────────────────────────────┘
        │                     │
        ▼                     ▼
  Next.js prod         FastAPI / gunicorn
   (osm-frontend)        (osm-backend)
                          │
                          ▼
                   PostgreSQL 16
                   db: opensourcemate
                   user: osm
```

**Locations on the server:**
- Code:           `/opt/opensourcemate/`
- Backend env:    `/opt/opensourcemate/backend/.env` (chmod 600)
- Frontend env:   `/opt/opensourcemate/frontend/.env.production`
- Nginx vhost:    `/etc/nginx/sites-available/opensourcemate`
- Systemd units:  `/etc/systemd/system/osm-backend.service`, `osm-frontend.service`

---

## 2. SSH access

A dedicated key was generated locally:

```bash
~/.ssh/id_ed25519_osm     # private (do not share)
~/.ssh/id_ed25519_osm.pub # public — already installed on droplet
```

`~/.ssh/config` includes the alias `osm`:

```
Host osm
    HostName 168.144.66.122
    User root
    IdentityFile ~/.ssh/id_ed25519_osm
```

So just:

```bash
ssh osm
```

---

## 3. Cloudflare DNS

Add these in the `opensourcemate.in` zone (proxied / orange cloud ON):

| Type | Name | Value             | Proxy |
|------|------|-------------------|-------|
| A    | @    | 168.144.66.122    | 🟠    |
| A    | www  | 168.144.66.122    | 🟠    |
| A    | api  | 168.144.66.122    | 🟠    |

SSL/TLS mode in Cloudflare → **Flexible** (visitor↔CF is HTTPS, CF↔origin is HTTP). Origin runs nginx on port 80 only — no certs on the droplet.

---

## 4. Services

```bash
# status
ssh osm 'systemctl is-active osm-backend osm-frontend nginx postgresql'

# logs
ssh osm 'journalctl -u osm-backend -n 50 --no-pager'
ssh osm 'journalctl -u osm-frontend -n 50 --no-pager'

# restart
ssh osm 'systemctl restart osm-backend'
ssh osm 'systemctl restart osm-frontend'
ssh osm 'systemctl reload nginx'
```

---

## 5. Standard deploy (push from laptop → pull on server)

```bash
# 1. Push code from laptop
cd /Users/redfoxhotels/opensource
git add -A && git commit -m "your change" && git push origin main

# 2. Pull on droplet and rebuild
ssh osm <<'REMOTE'
set -e
cd /opt/opensourcemate
git pull origin main

# Backend: install any new deps and restart
cd backend
./venv/bin/pip install -q -r requirements.txt
systemctl restart osm-backend

# Frontend: install + build + restart
cd ../frontend
npm install --no-audit --no-fund --silent
NEXT_PUBLIC_API_URL=https://api.opensourcemate.in npm run build
systemctl restart osm-frontend

# Verify
sleep 3
systemctl is-active osm-backend osm-frontend
curl -s -o /dev/null -w 'backend: %{http_code}\nfrontend: %{http_code}\n' \
    http://127.0.0.1:8000/ http://127.0.0.1:3000/
REMOTE
```

> **Always rebuild the frontend with the explicit env var** — if you just run
> `npm run build`, Next.js may bake in the wrong API URL.

---

## 6. Backend-only fix (no frontend rebuild)

```bash
ssh osm '
cd /opt/opensourcemate && git pull origin main &&
cd backend && ./venv/bin/pip install -q -r requirements.txt &&
systemctl restart osm-backend &&
sleep 2 && systemctl is-active osm-backend &&
journalctl -u osm-backend -n 20 --no-pager
'
```

---

## 7. Frontend-only fix

```bash
ssh osm '
cd /opt/opensourcemate && git pull origin main &&
cd frontend && npm install --no-audit --no-fund --silent &&
NEXT_PUBLIC_API_URL=https://api.opensourcemate.in npm run build &&
systemctl restart osm-frontend &&
sleep 3 && systemctl is-active osm-frontend
'
```

---

## 8. Database

```bash
# Connect
ssh osm 'sudo -u postgres psql opensourcemate'

# Quick table peek
ssh osm "sudo -u postgres psql -d opensourcemate -c '\\dt'"
ssh osm "sudo -u postgres psql -d opensourcemate -c 'SELECT id, email, name, user_type, onboarding_completed FROM users LIMIT 20;'"

# Backup
ssh osm 'sudo -u postgres pg_dump opensourcemate' > backup-$(date +%F).sql

# Restore (DESTRUCTIVE — local file → remote)
cat backup.sql | ssh osm 'sudo -u postgres psql opensourcemate'
```

> **Never delete `opensourcemate` DB.** For schema changes, use `ALTER TABLE`
> SQL migrations on the existing DB.

---

## 9. Environment variables

### Backend — `/opt/opensourcemate/backend/.env`

```env
DATABASE_URL=postgresql://osm:<DB_PASS>@localhost/opensourcemate
SECRET_KEY=<64-hex JWT secret>
ALLOWED_ORIGINS=https://opensourcemate.in,https://www.opensourcemate.in
```

Edit on server:

```bash
ssh osm 'nano /opt/opensourcemate/backend/.env && systemctl restart osm-backend'
```

### Frontend — `/opt/opensourcemate/frontend/.env.production`

```env
NEXT_PUBLIC_API_URL=https://api.opensourcemate.in
```

Note: this is read at **build** time — must rebuild after changes.

> **Never `scp` your local `.env` to production.** Edit the server `.env` directly.

---

## 10. Nginx vhost (`/etc/nginx/sites-available/opensourcemate`)

```nginx
server {
    listen 80;
    server_name opensourcemate.in www.opensourcemate.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.opensourcemate.in;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After edits:

```bash
ssh osm 'nginx -t && systemctl reload nginx'
```

---

## 11. Systemd units (reference)

`/etc/systemd/system/osm-backend.service`

```ini
[Unit]
Description=OpenSourceMate FastAPI backend
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/opensourcemate/backend
EnvironmentFile=/opt/opensourcemate/backend/.env
ExecStart=/opt/opensourcemate/backend/venv/bin/gunicorn main:app -k uvicorn.workers.UvicornWorker -w 2 -b 127.0.0.1:8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/osm-frontend.service`

```ini
[Unit]
Description=OpenSourceMate Next.js frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/opensourcemate/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

---

## 12. Smoke tests

```bash
# Direct (bypasses Cloudflare — useful while DNS propagates)
curl -s -H 'Host: opensourcemate.in' http://168.144.66.122/        # frontend HTML
curl -s -H 'Host: api.opensourcemate.in' http://168.144.66.122/    # {"status":"ok"}

# Via Cloudflare (after DNS)
curl -sI https://opensourcemate.in/
curl -s  https://api.opensourcemate.in/
curl -sI https://api.opensourcemate.in/docs

# End-to-end: register
curl -s -X POST https://api.opensourcemate.in/auth/register \
     -H 'Content-Type: application/json' \
     -d '{"email":"smoke@test.io","password":"smoke123"}'
```

---

## 13. Rollback

```bash
ssh osm '
cd /opt/opensourcemate
git log --oneline -5
git checkout <previous-commit-sha>
cd backend && ./venv/bin/pip install -q -r requirements.txt && systemctl restart osm-backend
cd ../frontend && NEXT_PUBLIC_API_URL=https://api.opensourcemate.in npm run build && systemctl restart osm-frontend
'
```

---

## 14. Hard rules

- **Never** rsync/scp local `.env` to production.
- **Never** delete the `opensourcemate` Postgres database.
- **Always** rebuild frontend with `NEXT_PUBLIC_API_URL=https://api.opensourcemate.in`.
- **Always** verify `systemctl is-active osm-backend osm-frontend` after a restart.
- One change → verify → next change. No batch deploys without verifying.
- Cloudflare SSL stays on **Flexible** — do not install certs on the origin.

---

## 15. First-time provision (already done — kept for disaster recovery)

```bash
# 0. SSH key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_osm -N "" -C osm-deploy
ssh-copy-id -i ~/.ssh/id_ed25519_osm.pub root@168.144.66.122

# 1. Packages
ssh osm 'apt-get update && apt-get install -y software-properties-common curl ca-certificates git ufw build-essential && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y python3.12 python3.12-venv python3-pip postgresql postgresql-contrib nginx nodejs'

# 2. Database (replace <DB_PASS>)
ssh osm "sudo -u postgres psql -c \"CREATE USER osm WITH PASSWORD '<DB_PASS>';\" && \
         sudo -u postgres createdb -O osm opensourcemate && \
         sudo -u postgres psql -d opensourcemate -c 'GRANT ALL ON SCHEMA public TO osm;'"

# 3. Code
ssh osm 'mkdir -p /opt/opensourcemate && cd /opt/opensourcemate && \
         git clone https://github.com/Zyora-Dev/opensourcemate.git .'

# 4. Backend
ssh osm 'cd /opt/opensourcemate/backend && python3.12 -m venv venv && \
         ./venv/bin/pip install -r requirements.txt && \
         ./venv/bin/pip install gunicorn'
# write /opt/opensourcemate/backend/.env (see §9)
# write /etc/systemd/system/osm-backend.service (see §11)

# 5. Frontend
ssh osm 'cd /opt/opensourcemate/frontend && npm install && \
         echo NEXT_PUBLIC_API_URL=https://api.opensourcemate.in > .env.production && \
         NEXT_PUBLIC_API_URL=https://api.opensourcemate.in npm run build'
# write /etc/systemd/system/osm-frontend.service (see §11)

# 6. Enable everything
ssh osm 'systemctl daemon-reload && systemctl enable --now osm-backend osm-frontend'

# 7. Nginx + UFW (see §10)
```
