# Deploying Scribly (Vercel + Render)

This app is two separate services that need to be deployed independently:

- **frontend/** (React + Vite, static build) → **Vercel**
- **backend/** (Express + MongoDB API) → **Render**
- **Database** → MongoDB Atlas (free tier is fine)

What was changed to make this deploy-ready:
- `frontend/src/api/axios.js` now reads `VITE_API_URL` at build time instead
  of always calling the relative `/api` path (which only worked because of
  the local Vite dev proxy).
- `frontend/vercel.json` added — rewrites all routes to `index.html` so
  React Router's client-side routes (`/dashboard`, `/editor/:id`, etc.)
  don't 404 on refresh or direct link.
- `backend/server.js` CORS now accepts a comma-separated list of origins
  via `CLIENT_ORIGIN`, so you can allow both a production and a preview
  Vercel URL at once.
- `backend/render.yaml` added — a Render "blueprint" so the service can be
  created with the right build/start commands and env vars pre-declared.
- Added `engines` to both `package.json` files and `.env.example` files.

## 1. Database — MongoDB Atlas
1. Create a free cluster at https://www.mongodb.com/cloud/atlas.
2. Add a database user (username/password).
3. Network Access → allow access from anywhere (`0.0.0.0/0`) — simplest for
   Render's dynamic IPs — or add Render's static outbound IPs if you're on
   a paid Render plan.
4. Get your connection string, e.g.
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/grammarly-clone`

## 2. Backend — Render
1. Push this repo to GitHub (if it isn't already).
2. In Render: **New → Blueprint**, point it at the repo — it will read
   `backend/render.yaml` and pre-fill the service. (Or **New → Web
   Service**, root directory `backend`, build command `npm install`, start
   command `npm start`.)
3. Set these environment variables on the service:
   - `MONGO_URI` — your Atlas connection string from step 1
   - `JWT_SECRET` — a long random string (Render can auto-generate this,
     as set up in `render.yaml`)
   - `JWT_EXPIRES_IN` — `7d` (already defaulted)
   - `CLIENT_ORIGIN` — your Vercel URL(s), comma-separated if more than
     one, e.g. `https://scribly.vercel.app,https://scribly-git-main-you.vercel.app`
     (you'll add this **after** step 3, once you know the Vercel URL —
     it's fine to redeploy the backend once to update it)
4. Deploy. Confirm it's alive by visiting
   `https://<your-service>.onrender.com/api/health` → should return
   `{"status":"ok"}`.

Note: Render's free tier spins down on inactivity, so the first request
after idling will be slow (cold start) — normal for the free plan.

## 3. Frontend — Vercel
1. In Vercel: **New Project**, import the same repo.
2. Set **Root Directory** to `frontend` (important — the repo has two
   apps in it).
3. Framework preset: Vite (auto-detected). Build command / output
   directory are already set via `frontend/vercel.json`.
4. Add an environment variable:
   - `VITE_API_URL` = `https://<your-render-service>.onrender.com/api`
5. Deploy. Vercel will give you a URL like `https://scribly.vercel.app`.
6. Go back to Render and set `CLIENT_ORIGIN` to that URL (see step 2.3),
   then redeploy the backend so CORS allows it.

## 4. Verify
- Visit your Vercel URL, sign up for an account, create a document, and
  confirm suggestions load in the editor (this proves the frontend is
  reaching the backend and the backend is reaching MongoDB).
- If signup/login fails, open the browser devtools Network tab: a CORS
  error means `CLIENT_ORIGIN` on Render doesn't match your Vercel URL
  exactly (including `https://`, no trailing slash); a failed request to
  the wrong host means `VITE_API_URL` wasn't set (or the project needs a
  redeploy after adding it — Vite env vars are baked in at build time).

## Local development (unchanged)
```bash
cd backend && npm install && cp .env.example .env   # fill in MONGO_URI, JWT_SECRET
npm run dev                                          # http://localhost:5000

cd frontend && npm install
npm run dev                                          # http://localhost:5173
```
Locally, don't set `VITE_API_URL` — the Vite dev server proxy in
`vite.config.js` forwards `/api` to `localhost:5000` automatically.
