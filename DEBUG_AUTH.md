## Authentication Debug Guide

### Current Issues:

1. **URL Corruption**: API requests are hitting malformed URLs
2. **404 Errors**: Backend endpoints are not being found
3. **User Not Found**: Authentication is failing

### Debug Steps:

#### 1. Check Environment Variables

-   Frontend: `VITE_API_BASE_URL` in `packages/ui/.env`
-   Backend: Make sure your Render backend is running

#### 2. Test API Endpoints

Open browser console and try:

```javascript
// Test if API is accessible
fetch('/api/v1/auth/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
})
    .then((response) => response.json())
    .then((data) => console.log('API Response:', data))
    .catch((error) => console.error('API Error:', error))
```

#### 3. Check Backend Server

Visit your backend URL directly: https://flowise-ai-cqlx.onrender.com/api/v1/auth/resolve

#### 4. Verify Vercel Deployment

-   Make sure environment variables are set in Vercel dashboard
-   Check build logs for any errors
-   Verify the rewrites are working correctly

### What I Fixed:

1. **Environment Variable**: Set `VITE_API_BASE_URL=""` to use relative URLs
2. **Vercel Rewrites**: Fixed the rewrite pattern to match `/api/v1/*` instead of `/api/*`
3. **API Client**: Added fallback logic for when baseURL is empty

### Expected Behavior:

-   Frontend requests go to `/api/v1/auth/login`
-   Vercel rewrites to `https://flowise-ai-cqlx.onrender.com/api/v1/auth/login`
-   Backend processes the authentication request

### Common Pitfalls:

-   Make sure your Render backend is actually running and accessible
-   Check if your backend database is properly configured
-   Verify SSL certificates are working
-   Ensure CORS settings allow requests from your Vercel domain
