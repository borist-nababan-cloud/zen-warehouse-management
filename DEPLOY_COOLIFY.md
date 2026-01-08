# Deploying to Coolify (VPS)

This guide explains how to deploy the **Warehouse Management System (Frontend)** to your Coolify instance.

## Recommended Method: Dockerfile (Best Choice)

I recommend using a **Dockerfile** instead of Nixpacks.

**Why?**
1.  **SPA Routing**: We need to serve the application using **Nginx** to correctly handle client-side routing (so reloading a page like `/dashboard` doesn't give a 404 error).
2.  **Performance**: Nginx is much faster and lighter than running a Node.js server just to serve static files.
3.  **Control**: We can configure Gzip compression and caching headers explicitly.

---

## Step 1: Preparation

I have already created the necessary files in your project root:
1.  `Dockerfile`: A multi-stage build script (Builds React App -> Serves with Nginx).
2.  `nginx.conf`: Nginx configuration to handle routing and compression.

**Action Required:**
Push these new files to your Git repository (GitHub/GitLab).

```bash
git add Dockerfile nginx.conf
git commit -m "chore: add docker deployment config"
git push
```

---

## Step 2: Configure Coolify

1.  **Login** to your Coolify dashboard.
2.  **Select Project**: Go to your project and environment.
3.  **Add New Resource**:
    *   Select **Function/Service** or **Application**.
    *   Choose **Public Repository** (or Private if you connected GitHub).
    *   Select your repository and branch (e.g., `main`).
4.  **Build Pack**:
    *   Coolify might auto-detect "Docker" because a `Dockerfile` now exists.
    *   If asked, explicitly select **Dockerfile** as the Build Pack.
5.  **Configuration**:
    *   **Port**: `80` (The Dockerfile exposes port 80).
    *   **Domains**: Set your domain (e.g., `https://wms.nababancloud.com`).
6.  **Environment Variables**:
    *   copy all values from your local `.env` file to the Coolify "Environment Variables" section.
    *   **Important**: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly!

---

## Step 3: Deploy

1.  Click **Deploy**.
2.  Watch the build logs. You should see:
    *   Step 1: `npm install` and `npm run build`
    *   Step 2: Nginx starting up
3.  Once the status is **"Running"**, visit your domain.

## Why not Nixpacks?
Nixpacks is great and easy, but for a pure **Single Page Application (SPA)** like this, it often defaults to running a simple static server which might not handle the "Fallback to index.html" logic correctly out of the box without extra config. Using a custom **Dockerfile + Nginx** guarantees it works exactly how standard React apps should be deployed.
