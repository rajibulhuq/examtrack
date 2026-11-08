# ExamTrack BD
Personal BCS exam tracker. React + TS + Vite + Tailwind + Recharts. Offline-first (IndexedDB) with optional Google Drive sync.

## Run locally
    npm install
    cp .env.example .env     # add VITE_GOOGLE_CLIENT_ID (optional; app works in local mode without it)
    npm run dev              # http://localhost:5173

## Google Cloud setup
1. console.cloud.google.com → create a project.
2. APIs & Services → Library → enable **Google Drive API**.
3. OAuth consent screen: External, add yourself as a Test user, add scope `.../auth/drive.file`.
4. Credentials → Create credentials → **OAuth client ID** → Web application.
5. Authorized JavaScript origins: `http://localhost:5173` and your Vercel URL (e.g. `https://examtrack-bd.vercel.app`). No redirect URIs or client secret needed.
6. Copy the Client ID into `.env` as `VITE_GOOGLE_CLIENT_ID`.
The `drive.file` scope only lets the app see files it created, so no full-Drive access is requested.

## Deploy to Vercel
Push to GitHub → vercel.com → Import → Framework: Vite (build `npm run build`, output `dist`) → add env var `VITE_GOOGLE_CLIENT_ID` → Deploy → add the deployed URL to authorized origins.

## Data safety
Records merge by unique ID (newest `updatedAt` wins); deletes are tombstones, so a stale device never erases newer cloud data. Each sync saves a dated copy in `Backups/`.

## Phone e install (PWA)
Vercel e deploy korar por phone er browser e URL open koro → Android Chrome: menu → "Install app"; iPhone Safari: Share → "Add to Home Screen".
