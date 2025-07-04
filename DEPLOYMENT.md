# Flowise Deployment Checklist

This guide documents the environment variables required when deploying the Flowise UI on Vercel and the backend on Render. It also provides sample `curl` commands to verify the setup.

## Environment Variables

Set the following variables on the Render service:

| Variable         | Description                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `PORT`           | Port the Express server listens on (default `3000`).                                                    |
| `CORS_ORIGINS`   | Allowed comma-separated origins. Example: `https://flowise-ui-deploy.vercel.app,http://localhost:3000`. |
| `DATABASE_PATH`  | Location for the SQLite database.                                                                       |
| `SECRETKEY_PATH` | Path used to store encryption keys.                                                                     |
| `LOG_PATH`       | Directory for application logs.                                                                         |

Ensure the Vercel project defines:

| Variable            | Description                              |
| ------------------- | ---------------------------------------- |
| `VITE_API_BASE_URL` | Base URL for API requests (e.g. `/api`). |
| `VITE_UI_BASE_URL`  | URL where the frontend is hosted.        |

## Verification

After deployment, run the following commands from your local machine to test CORS and JSON handling:

```bash
# Preflight
curl -i -X OPTIONS https://flowise-ui-deploy.vercel.app/api/chatflows \
  -H "Origin: https://flowise-ui-deploy.vercel.app" \
  -H "Access-Control-Request-Method: GET"

# Actual request
curl -i https://flowise-ui-deploy.vercel.app/api/chatflows \
  -H "Origin: https://flowise-ui-deploy.vercel.app"
```

Both commands should return a `204` response for the preflight request and JSON for the real request.

# Deployment Thu Jun 19 13:18:43 MST 2025
