# Release Checklist

## 1. Environment Guardrails
- [ ] Validated `.env` file exists and `NODE_ENV=production`.
- [ ] Confirmed `JWT_SECRET` and `REFRESH_SECRET` are rotated from dev defaults.
- [ ] MONGODB_URI points to the production Replica Set.

## 2. Infrastructure Guardrails
- [ ] `docker-compose.yml` mounts persistent volumes for MongoDB.
- [ ] Port `5000` is securely mapped and exposed behind an SSL/TLS terminating Reverse Proxy (Nginx/Traefik).
- [ ] RAM allocation on host machine is at least 2GB to support V8 memory spikes during heavy faceting.

## 3. Liveness Check
- [ ] Ping `http://<domain>/health/live` returns HTTP 200 `status: UP`.
- [ ] Ping `http://<domain>/health/ready` returns HTTP 200, confirming active Database bindings.
