# NASA Lunar South-Pole Navigator — complete project package

This ZIP contains the frontend, local Node.js backend, Vercel serverless API routes, and API reference material.

## Folder map
- `index.html` — Vercel website entry page.
- `frontend/` — website source and your original uploaded HTML.
- `backend/` — local Node.js backend for running on your laptop.
- `api/` and `lib/` — Vercel serverless API routes and shared server-side API code.
- `api-integrations/` — NASA, OpenAI and Gemini endpoint reference.
- `vercel.json` — Vercel project configuration.

## Deploy on Vercel
Vercel's dashboard does not deploy by simply extracting a ZIP inside the dashboard. Extract this ZIP on your computer, then either:

### Option A — Vercel CLI
1. Install Node.js 18 or newer: https://nodejs.org/
2. Open a terminal in this extracted project folder (the folder containing `vercel.json`).
3. Run `npm install -g vercel`.
4. Run `vercel login` and sign in to your Vercel account.
5. Run `vercel` for a preview deployment, or `vercel --prod` for production.
6. Follow the prompts. Vercel prints the deployed website URL when deployment succeeds.

### Option B — GitHub import
1. Create a new GitHub repository.
2. Upload the CONTENTS of this extracted project folder (not the ZIP itself).
3. In Vercel, choose Add New → Project and import that repository.
4. Keep the project root as the repository root. Framework preset: Other. No build command is required.
5. Deploy.

## Configure AI keys on Vercel
After importing the project, open Vercel → Project → Settings → Environment Variables. Add at least one:
- `OPENAI_API_KEY` — key from https://platform.openai.com/api-keys
- `GEMINI_API_KEY` — key from https://aistudio.google.com/app/apikey

Optional model variables:
- `OPENAI_MODEL` (default `gpt-4.1-mini`)
- `GEMINI_MODEL` (default `gemini-3.8-flash`)

Save variables and redeploy. Do not paste keys into the HTML or commit them to GitHub. You do not need both providers; if both are set, `/api/ai/chat` uses OpenAI and `/api/gemini/chat` uses Gemini.

## Run locally on Windows
1. Install Node.js 18+.
2. Open the `backend` folder in VS Code.
3. Copy `backend/.env.example` to `backend/.env` and add your AI key (optional for NASA-only features).
4. Open a terminal in `backend` and run `node server.js` (or double-click `start-windows.bat`).
5. Open http://localhost:3000 on the same computer.

## API endpoints
- `GET /api/health`
- `GET /api/nasa/sources`
- `GET /api/nasa/horizons?start=YYYY-MM-DD&stop=YYYY-MM-DD&step=1h`
- `POST /api/ai/chat`
- `POST /api/gemini/chat`

See `api-integrations/API_ENDPOINTS.md` for external official links.

## Important scientific limitation
The current Horizons query returns Moon ephemeris data observed from Earth's geocentre (`500@399`). It is not a lunar south-pole surface observer and cannot by itself calculate local horizon visibility, terrain masking, slope, illumination duration or landing safety. Accurate local analysis requires appropriate lunar SPICE kernels, surface/terrain data and validated calculations. AI answers are research assistance, not mission certification.

## About an Android APK
This ZIP is a responsive website project, not a compiled Android APK. An APK needs a separate Android wrapper/build and signing process; no APK is included or claimed here.
