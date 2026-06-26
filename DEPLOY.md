# Deploying to Render

The repo is already configured for Render via `render.yaml`. You need to do
three things — create a GitHub repo, push, then connect it to Render.

## 1. Create a GitHub repo and push

```bash
cd "/home/ayush/Downloads/Veolia/Veolia FMS/app"

# Create the repo on GitHub via the `gh` CLI (interactive)…
gh repo create veolia-fms --private --source=. --remote=origin --push

# …or skip the CLI: create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/veolia-fms.git
git push -u origin main
```

If you don't have `gh` installed: `sudo apt install gh && gh auth login`.

## 2. Connect Render to the repo

1. Go to <https://dashboard.render.com> and sign in (free account is fine).
2. Click **New +** → **Blueprint**.
3. Pick the GitHub repo `veolia-fms`. Render reads `render.yaml` automatically.
4. The blueprint will show a single web service named **veolia-fms** with:
   - Plan: **Free**
   - Build: `npm install --include=dev && npm run build`
   - Start: `npm run start`
   - Env: `DATABASE_URL=file:./dev.db`, `NODE_VERSION=18.20.8`
5. Click **Apply**.

First build takes ~3–4 minutes. You'll get a URL like
`https://veolia-fms.onrender.com`.

## 3. Share the URL with Harish

Send him the Render URL. The login page accepts any role from the dropdown.
Suggest he start with **Finance Team** for the full view.

## Notes about the demo deployment

- **SQLite, no persistent disk** (Render free tier doesn't include one).
  The DB is created and seeded at *build* time. After deploy, anyone can edit
  values, approve submissions, resolve reconciliation mismatches, etc., and
  those writes persist while the container is warm. **Cold starts** (after
  ~15 minutes idle) restart with the original seeded state.
- **No real authentication**. The role selector on the login page is a
  dropdown; anyone with the URL can pick any role.
- **First request after idle** can take ~30 seconds while Render spins the
  container back up.
- **Re-seeding manually**: trigger a redeploy on Render (Manual Deploy button)
  to reset the DB to the seed state — useful before the next demo session.

## Future hardening (when this graduates beyond POC)

1. Move to a persistent host (Render paid tier with disk, or migrate Prisma
   to Postgres on Neon / Render Postgres).
2. Add real authentication (NextAuth with Veolia SSO or Microsoft Entra).
3. Move secrets (DATABASE_URL, API keys) into Render's env vars panel rather
   than `render.yaml`.
4. Add CI on the GitHub repo to run `tsc --noEmit` and `next build` on every
   push before Render rebuilds.
