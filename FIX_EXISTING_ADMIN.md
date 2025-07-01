# Fix Existing Admin Account for Modern Authentication

Your existing account details:

-   Name: Marcus
-   Email: marcus99thomas@gmail.com
-   Password: Makemoney23$

## Database Commands to Fix Your Account

Connect to your PostgreSQL database and run these commands:

### Step 1: Check if your account exists

```sql
SELECT id, email, role, "createdDate", "updatedDate" FROM "user" WHERE email = 'marcus99thomas@gmail.com';
```

### Step 2: If account exists, update it for modern auth

```sql
-- Generate a proper password hash for 'Makemoney23$'
-- You'll need to hash this password properly, or we can do it through the application

-- First, let's see the current state
SELECT * FROM "user" WHERE email = 'marcus99thomas@gmail.com';

-- Update the user to ensure it has proper admin role
UPDATE "user"
SET
    role = 'ADMIN',
    "updatedDate" = NOW()
WHERE email = 'marcus99thomas@gmail.com';
```

### Step 3: Clean up any basic auth workspace/org issues

```sql
-- Remove problematic basic auth entries
DELETE FROM "workspace" WHERE name = 'basic-auth-workspace';
DELETE FROM "organization" WHERE name = 'basic-auth-org';
```

## Alternative: Reset Password Through Application

If the above doesn't work, we can:

1. Temporarily re-enable basic auth
2. Log in with your account
3. Change the password through the UI
4. Remove basic auth again
5. Log in with the new password

## Fastest Solution:

1. Add basic auth variables temporarily to Render
2. Log in with marcus99thomas@gmail.com / Makemoney23$
3. Go to user settings and change/confirm your password
4. Remove basic auth variables
5. Log in normally with email/password
