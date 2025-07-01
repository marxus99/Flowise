# Database User Migration Script

If you want to convert your existing basic auth user to a proper modern auth user, you can run these SQL commands in your PostgreSQL database:

## Check Current Users

```sql
-- See what users exist
SELECT id, email, role, "createdDate", "updatedDate" FROM "user";

-- Check for basic auth workspace/org associations
SELECT * FROM "workspace" WHERE name = 'basic-auth-workspace';
SELECT * FROM "organization" WHERE name = 'basic-auth-org';
```

## Option 1: Update Existing User (if you want to keep same email)

```sql
-- Update the existing user to remove basic auth associations
UPDATE "user"
SET
    password = '$2b$10$newHashedPasswordHere',  -- You'll need to hash a new password
    "updatedDate" = NOW()
WHERE email = 'marcus99thomas@gmail.com';

-- Clean up basic auth workspace/org if they exist
DELETE FROM "workspace" WHERE name = 'basic-auth-workspace';
DELETE FROM "organization" WHERE name = 'basic-auth-org';
```

## Option 2: Clean Slate (Recommended)

```sql
-- Remove the basic auth user entirely
DELETE FROM "user" WHERE email = 'marcus99thomas@gmail.com' AND role = 'ADMIN';

-- Clean up basic auth workspace/org
DELETE FROM "workspace" WHERE name = 'basic-auth-workspace';
DELETE FROM "organization" WHERE name = 'basic-auth-org';

-- Now register fresh via the UI
```

## Option 3: Check if you already have a proper user

```sql
-- Look for non-basic-auth users
SELECT * FROM "user" WHERE email != 'admin' AND email NOT LIKE '%basic%';
```

**IMPORTANT**:

-   Make a database backup before running any DELETE commands
-   Option 2 (clean slate) is usually the safest and simplest
-   After cleaning up, just register normally via the UI
