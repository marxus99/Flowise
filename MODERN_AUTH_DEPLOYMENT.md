# Modern Authentication Deployment Guide

## 🚀 Transitioning from Basic Auth to Modern Authentication

### Why Make This Change?

Basic authentication (`FLOWISE_USERNAME` and `FLOWISE_PASSWORD`) has significant limitations:

-   Single user for all operations
-   Permission/workspace issues
-   Cannot delete workflows properly
-   No real user management
-   Security vulnerabilities
-   Enterprise features don't work

### Step 1: Backup Your Data

```bash
# Backup your existing database (if using SQLite)
cp ./database.sqlite ./database.sqlite.backup

# Or if using PostgreSQL/MySQL, create a dump
# pg_dump your_database > backup.sql
```

### Step 2: Update Environment Configuration

1. **Copy the production config:**

    ```bash
    cp .env.production .env
    ```

2. **Remove basic auth variables from your .env:**
   Remove or comment out:

    ```bash
    # FLOWISE_USERNAME=admin
    # FLOWISE_PASSWORD=1234
    ```

3. **Add JWT secret for security:**
    ```bash
    echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
    ```

### Step 3: Database Migration Options

#### Option A: Keep Existing Data (Recommended)

Your existing chatflows, credentials, and data will be preserved, but you'll need to create a new user account.

#### Option B: Fresh Start

If you want to start completely fresh:

```bash
# Remove existing database
rm -f database.sqlite
# Or drop/recreate your PostgreSQL/MySQL database
```

### Step 4: Deploy with Modern Auth

1. **Install dependencies:**

    ```bash
    pnpm install
    ```

2. **Build the application:**

    ```bash
    pnpm build
    ```

3. **Start Flowise:**
    ```bash
    pnpm start
    ```

### Step 5: Create Your First User

1. **Open Flowise in your browser** (default: http://localhost:3000)

2. **You'll see a registration page** - create your account:

    - Email: your-email@domain.com
    - Password: choose a strong password
    - Confirm password

3. **Login with your new account**

### Step 6: Verify Everything Works

Test all operations:

-   ✅ Create chatflows
-   ✅ Save chatflows
-   ✅ Delete chatflows (now works!)
-   ✅ Create credentials
-   ✅ Upload documents
-   ✅ API key management
-   ✅ Workspace operations

### Advanced Configuration

#### Custom JWT Configuration

```bash
# In your .env file
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
```

#### CORS Configuration (if needed)

```bash
CORS_ORIGIN=https://yourdomain.com
```

#### Production Database

For production, consider PostgreSQL:

```bash
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=flowise
DATABASE_PASSWORD=your-db-password
DATABASE_NAME=flowise
DATABASE_SSL=true
```

### Troubleshooting

#### Issue: "Cannot access after switching"

-   Clear browser cache and cookies
-   Try incognito/private browsing mode
-   Check that no FLOWISE_USERNAME/FLOWISE_PASSWORD are set

#### Issue: "Lost my chatflows"

-   Your data is still there, just associated with the old "basic-auth-user"
-   You may need to re-import or recreate some workflows
-   Check the database for existing data

#### Issue: "Still getting permission errors"

-   Ensure you're logged in with a real user account
-   Check that the user has proper workspace access
-   Verify JWT_SECRET is set

### Security Best Practices

1. **Set a strong JWT secret:**

    ```bash
    JWT_SECRET=$(openssl rand -base64 32)
    ```

2. **Use HTTPS in production:**

    ```bash
    HTTPS=true
    HTTPS_KEY=/path/to/private-key.pem
    HTTPS_CERT=/path/to/certificate.pem
    ```

3. **Set CORS properly:**

    ```bash
    CORS_ORIGIN=https://yourdomain.com
    ```

4. **Use a production database:**
   PostgreSQL or MySQL instead of SQLite

### Migration Script (Optional)

If you need to migrate data from basic-auth-user to a real user:

```sql
-- Example SQL to migrate data (adjust based on your needs)
-- This assumes you have a new user with ID 'your-new-user-id'

UPDATE chatflow SET userId = 'your-new-user-id' WHERE userId = 'basic-auth-user';
UPDATE credential SET userId = 'your-new-user-id' WHERE userId = 'basic-auth-user';
UPDATE document_store SET userId = 'your-new-user-id' WHERE userId = 'basic-auth-user';
```

### Summary

After this migration:

-   ✅ Proper user authentication and sessions
-   ✅ Full CRUD operations (including delete!)
-   ✅ Better security
-   ✅ Enterprise features work
-   ✅ Proper workspace/organization management
-   ✅ No more UUID errors with special cases
-   ✅ Modern, maintainable setup

The system will be much more robust and feature-complete!
