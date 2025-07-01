# Flowise Modern Authentication Migration Guide

## Problem Summary

Your Flowise instance was running in "hybrid mode" with:

-   Basic auth credentials (`FLOWISE_USERNAME` and `FLOWISE_PASSWORD`)
-   Real PostgreSQL database
-   This caused UUID errors with 'basic-auth-workspace' and 'basic-auth-org'

## Solution: Remove Basic Auth

### Step 1: Update Environment Variables

The `.env.production` file has been updated to remove basic auth variables:

-   ✅ Removed `FLOWISE_USERNAME`
-   ✅ Removed `FLOWISE_PASSWORD`
-   ✅ Kept GitHub OAuth configuration
-   ✅ Kept PostgreSQL database configuration

### Step 2: Deploy/Restart Flowise

1. **If using Render.com or similar platform:**

    - Update your environment variables in the platform dashboard
    - Remove `FLOWISE_USERNAME` and `FLOWISE_PASSWORD`
    - Keep all other variables as they are
    - Redeploy the service

2. **If running locally:**
    ```bash
    # Stop your current Flowise instance
    # Use the new .env.production file
    npm run start
    ```

### Step 3: Register Admin User

1. **Go to your Flowise URL:** https://flowise-ai-cqlx.onrender.com
2. **You should see a registration/login page** (no more automatic basic auth login)
3. **Register a new admin user** with your email
4. **Or use GitHub OAuth** if you prefer

### Step 4: Verify Everything Works

After registration/login, test:

-   ✅ Create new chatflows/agentflows
-   ✅ Save and update workflows
-   ✅ Delete workflows (should work without permission errors)
-   ✅ Manage API keys
-   ✅ Import/export workflows
-   ✅ All operations should work without UUID errors

## What This Fixes

-   ❌ "invalid input syntax for type uuid: 'basic-auth-workspace'"
-   ❌ "invalid input syntax for type uuid: 'basic-auth-org'"
-   ❌ Permission errors when deleting workflows
-   ❌ "String is not initialized" errors
-   ❌ Stripe configuration issues
-   ❌ All UUID validation errors

## Database Migration (Optional)

Your PostgreSQL database will continue to work. If you want to clean up old data:

```sql
-- Optional: Remove basic auth user data (run in your PostgreSQL database)
-- WARNING: Only run this if you're sure you want to remove all old basic auth data

-- Check what basic auth data exists
SELECT * FROM "user" WHERE email = 'marcus99thomas@gmail.com';
SELECT * FROM workspace WHERE name = 'basic-auth-workspace';
SELECT * FROM organization WHERE name = 'basic-auth-org';

-- If you want to remove basic auth data (optional):
-- DELETE FROM "user" WHERE email = 'marcus99thomas@gmail.com' AND role = 'ADMIN';
-- Note: Be careful with these operations in production
```

## Recommended Next Steps

1. **Deploy with the new configuration**
2. **Register your admin user**
3. **Test all functionality**
4. **Remove basic auth environment variables from your hosting platform**
5. **Document the new login process for your team**

## GitHub OAuth Setup (Alternative)

If you prefer GitHub OAuth over email registration:

1. Your GitHub OAuth is already configured
2. Users can click "Login with GitHub" on the login page
3. First GitHub user will become admin

## Security Notes

-   Your JWT secrets and database remain unchanged
-   All existing workflows and data are preserved
-   Only the authentication method changes
-   Much more secure than basic auth

## Troubleshooting

If you still see issues:

1. **Clear browser cache/cookies**
2. **Verify environment variables are updated on your hosting platform**
3. **Check that FLOWISE_USERNAME and FLOWISE_PASSWORD are completely removed**
4. **Restart the application completely**

## Success Indicators

✅ No more UUID errors in logs
✅ Proper login page appears
✅ Can register/login as admin user
✅ All workflow operations work correctly
✅ Proper permissions for all actions
