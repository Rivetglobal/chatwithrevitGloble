# Coolify Deployment Guide

## Usage dashboard shows 0 chat time?

The **API** must be redeployed separately from the frontend. The dashboard reads past chat usage from the API server (`apirivetassist.rivetai.co.uk`), not from the browser.

1. Coolify → **API** app (domain `apirivetassist.rivetai.co.uk`)
2. **Redeploy** with **Force rebuild**
3. Verify: open `https://apirivetassist.rivetai.co.uk/api/health`
   - Should include `"usageBackfill": 3` and `"build": "2026-08-25-usage-v3"`
4. Hard-refresh Admin → Dashboard and select **All time**

If health shows no `usageBackfill`, the API is still on old code. Chat history cannot appear until the API redeploys.

Add GitHub secret **`COOLIFY_API_WEBHOOK_URL`** so API auto-redeploys on merge to `main`.

---

## If production shows “nothing changed” after a merge

The API and the **frontend** are separate Coolify apps. Merging to `main` does **not** update the UI unless the frontend app rebuilds.

1. Coolify → **frontend / client** app (domain `rivetassist.rivetai.co.uk`)
2. **Redeploy** with **Force rebuild** (disable Docker cache if the option exists)
3. Wait until the deploy finishes
4. Hard-refresh the browser (`Ctrl+Shift+R` / `Cmd+Shift+R`)
5. Check https://rivetassist.rivetai.co.uk/version.json — it should show a new `build` string

Optional but recommended: add GitHub Actions secrets so merges auto-trigger Coolify:

- `COOLIFY_WEBHOOK_URL` — Deploy webhook for the **frontend** app
- `COOLIFY_API_WEBHOOK_URL` — Deploy webhook for the **API** app

Without `COOLIFY_WEBHOOK_URL`, the Action still passes and prints a warning. Coolify Git auto-deploy (if enabled on the frontend app) may rebuild on its own; otherwise Redeploy the frontend app manually.

---

## Prerequisites

- Coolify instance running
- Access to your Git repository (GitHub, GitLab, etc.)
- Docker installed on your Coolify server

## Deployment Steps

### 1. Create Application in Coolify

1. Log into your Coolify dashboard
2. Click "Add Application"
3. Select "Dockerfile" as the application type
4. Connect your Git repository

### 2. Configure Application Settings

**Basic Configuration:**

- **Application Name:** `chat-client`
- **Git Repository:** [Your repository URL]
- **Branch:** `main` (or your deployment branch)
- **Build Context:** `/client`
- **Dockerfile Path:** `Dockerfile` (relative to build context)

**Environment Variables:**

- `VITE_API_URL`: [Your backend API URL, e.g., https://your-api.example.com/api]

**Build Settings:**

- **Build Command:** (Leave empty - Dockerfile handles build)
- **Start Command:** (Leave empty - Dockerfile CMD handles this)
- **Health Check URL:** `/` (or any route that returns 200)

### 3. Configure Services

**Database:** Not needed for client-only deployment

**Storage:** Not needed for static React app

**Domains:**

- Add your domain (e.g., `client.yourapp.com`)
- Enable SSL certificate (Let's Encrypt)

### 4. Deploy

1. Click "Deploy Application"
2. Monitor the deployment logs
3. Wait for successful deployment

## Alternative: Using Docker Compose

If you prefer to use Docker Compose with Coolify:

1. Create a new application
2. Select "Docker Compose" as type
3. Set **Docker Compose Location** to `/client/docker-compose.yml`
4. The configuration is already in the file at `/client/docker-compose.yml`

## Environment Variables for Different Environments

**Development:**

```
VITE_API_URL=http://localhost:3000/api
```

**Staging:**

```
VITE_API_URL=https://staging-api.yourapp.com/api
```

**Production:**

```
VITE_API_URL=https://api.yourapp.com/api
```

## Monitoring

- Check deployment logs in Coolify dashboard
- Monitor application health
- View resource usage (CPU, Memory)
- Set up alerts if needed

## Troubleshooting

**Common Issues:**

1. **Build fails:** Check Dockerfile syntax and dependencies
2. **Health check fails:** Verify nginx.conf and application routes
3. **SSL issues:** Ensure domain is properly configured
4. **Environment variables:** Double-check VITE_API_URL format

**Debug Steps:**

1. Check Coolify deployment logs
2. Verify Docker image builds locally
3. Test nginx configuration
4. Confirm environment variables are set correctly

**Common Docker Compose Issues:**

- **"File not found" error:** Ensure Docker Compose Location points to `/client/docker-compose.yml`
- **Build context issues:** Make sure build context includes all necessary files
- **Environment variables:** Use `${VITE_API_URL:-default}` format in docker-compose.yml

## Post-Deployment

1. Test your application at the configured domain
2. Verify API connectivity
3. Check SSL certificate status
4. Monitor performance and logs
