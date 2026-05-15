# CounselWise Platform

A comprehensive college counseling and predictor platform.

## Development

Start both frontend and backend with a single command from the root:

```bash
npm install
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## Structure

- `/client`: React + Vite frontend
- `/server`: Node.js + Express backend

## Render Deployment (Backend)

**Settings:**
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: `Node`
- **Instance Type**: `Free`

**Required Environment Variables:**
- `MONGO_URI`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `CLIENT_URL` (URL of your deployed frontend)
- `NODE_ENV=production`

*Note: Render automatically injects the `PORT` variable.*
