# Flowise Frontend-Backend Configuration Guide

## Current Setup: Separate Frontend (Vercel) + Backend (Render)

### Required Configuration:

#### 1. Vercel Environment Variables

Set these in your Vercel dashboard:

```
VITE_API_BASE_URL=https://flowise-ai-cqlx.onrender.com
VITE_UI_BASE_URL=https://flowise-ui-deploy.vercel.app
VITE_USE_PROXY=false
```

#### 2. Authentication Flow

1. User visits: `https://flowise-ui-deploy.vercel.app`
2. Login requests go to: `https://flowise-ai-cqlx.onrender.com/api/v1/login`
3. All API calls go to: `https://flowise-ai-cqlx.onrender.com/api/v1/*`
4. Session cookies work across domains (CORS configured)

#### 3. CORS Verification

Your backend already has:

```
CORS_ORIGINS=https://flowise-ui-deploy.vercel.app,https://flowise-ai-cqlx.onrender.com
```

### Testing:

1. Deploy updated frontend to Vercel
2. Log in via Vercel frontend
3. Verify API calls work in browser dev tools

---

## Alternative: Single Domain Approach (Simpler)

If you want to avoid cross-domain complexity:

### Option A: Everything on Render

1. Build UI: `npm run build` in packages/ui
2. Configure Render to serve static files
3. Access everything at: `https://flowise-ai-cqlx.onrender.com`

### Option B: Everything on Vercel

1. Use Vercel serverless functions for backend
2. Deploy both frontend and API to Vercel
3. More complex but single domain

---

## Recommended: Keep Current Setup

Your current setup is actually good:

-   ✅ Render for backend (better for long-running processes)
-   ✅ Vercel for frontend (optimized for static serving)
-   ✅ CORS properly configured
-   ✅ Just needs API URL configuration

**Next Steps:**

1. Update Vercel environment variables
2. Redeploy frontend
3. Test login flow
