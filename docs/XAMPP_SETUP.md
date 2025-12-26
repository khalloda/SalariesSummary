# XAMPP Setup Guide for salaries.local

This guide explains how to set up the Salaries Summary application to work with XAMPP and the `salaries.local` domain.

## Prerequisites

1. XAMPP installed and running
2. Node.js installed (for the API backend)
3. Domain `salaries.local` configured in your hosts file

## Step 1: Configure Hosts File

Add the following line to your hosts file:

**Windows**: `C:\Windows\System32\drivers\etc\hosts`
```
127.0.0.1    salaries.local
```

**Note**: You may need administrator privileges to edit this file.

## Step 2: Configure XAMPP Virtual Host

Edit `C:\xampp\apache\conf\extra\httpd-vhosts.conf` and add:

```apache
<VirtualHost *:80>
    ServerName salaries.local
    DocumentRoot "C:/xampp/htdocs/salaries/web/dist"
    
    <Directory "C:/xampp/htdocs/salaries/web/dist">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Proxy API requests to Node.js backend
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api
</VirtualHost>
```

**Important**: Update the paths to match your actual project location.

## Step 3: Enable Required Apache Modules

Edit `C:\xampp\apache\conf\httpd.conf` and ensure these modules are enabled (uncomment if needed):

```apache
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule headers_module modules/mod_headers.so
```

## Step 4: Build the React Application

```bash
cd apps/web
npm install
npm run build
```

This creates the production build in `apps/web/dist`.

## Step 5: Copy Files to XAMPP

**Option A: Symlink (Recommended)**
```bash
# Create symlink from XAMPP to your project
mklink /D "C:\xampp\htdocs\salaries" "D:\Claude\SalariesSummary"
```

**Option B: Copy Build Files**
```bash
# Copy the built React app
xcopy /E /I "apps\web\dist" "C:\xampp\htdocs\salaries\web\dist"
```

## Step 6: Start the API Backend

The API must run separately on port 3001:

```bash
cd apps/api
npm install
npm run dev
```

Or in production:
```bash
npm run build
npm start
```

## Step 7: Access the Application

1. Start XAMPP (Apache)
2. Ensure the API backend is running on port 3001
3. Open your browser and navigate to: `http://salaries.local`

## Alternative: Development Mode with XAMPP

If you want to use XAMPP for the frontend but keep development mode:

1. **Keep Vite dev server running** on port 3000
2. **Update Apache proxy** to point to Vite:
   ```apache
   ProxyPass / http://localhost:3000/
   ProxyPassReverse / http://localhost:3000/
   ```
3. **Update Vite config** to handle the proxy correctly

## Troubleshooting

### API calls fail
- Ensure the API backend is running on port 3001
- Check Apache error logs: `C:\xampp\apache\logs\error.log`
- Verify proxy configuration in httpd-vhosts.conf

### 404 errors
- Check that the DocumentRoot points to the correct dist folder
- Ensure .htaccess file is in the web root
- Verify mod_rewrite is enabled

### CORS errors
- The API should handle CORS, but you can also configure it in Apache
- Check that mod_headers is enabled

### Domain not resolving
- Verify hosts file entry
- Try `ping salaries.local` to test DNS resolution
- Clear browser cache

## Production Considerations

For production deployment:

1. **Build the React app** with production optimizations
2. **Use PM2** or similar to manage the Node.js API process
3. **Configure SSL** if needed
4. **Set up proper logging** and monitoring
5. **Use environment variables** for configuration

## File Structure in XAMPP

```
C:\xampp\htdocs\salaries\
├── web\
│   └── dist\          # React build output
├── api\               # API source (if copied)
└── .htaccess          # Apache configuration
```

Or with symlink:
```
D:\Claude\SalariesSummary\  (original location)
└── (symlinked to C:\xampp\htdocs\salaries)
```

