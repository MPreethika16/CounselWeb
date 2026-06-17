# Deployment Runbook

## Docker Installation
Ensure Docker and Docker Compose are installed on the target machine.

## Initial Setup
1. Clone the repository onto the production server.
2. Copy `.env.example` to `.env` and populate all secrets (`JWT_SECRET`, `REFRESH_SECRET`, `MONGODB_URI`).
3. Run `docker-compose up --build -d`

## Disaster Recovery
- **Backup Data:** Trigger the `backupService` via admin dashboard or use `docker exec counselweb-mongo mongodump --out /data/backup`
- **Restore Data:** `docker exec counselweb-mongo mongorestore /data/backup`
- **Secret Compromise:** Rotate the `JWT_SECRET` in `.env`, then run `docker-compose restart counselweb-api`. All current sessions will instantly invalidate, forcing all users to re-login securely.
