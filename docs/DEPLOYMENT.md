# Deployment Guide

## Development Deployment

### Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Excel workbooks in `./Sheets/` directory

### Steps

1. **Clone/Download Project**
   ```bash
   cd SalariesSummary
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Set Up Database**
   ```bash
   cd apps/api
   pnpm prisma generate
   pnpm prisma migrate dev
   ```

4. **Start Development Servers**
   ```bash
   # From root directory
   pnpm dev
   ```

5. **Access Application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## XAMPP Deployment

See `docs/XAMPP_SETUP.md` for detailed XAMPP deployment instructions.

### Quick Steps

1. **Build Applications**
   ```bash
   pnpm build
   ```

2. **Copy Files to XAMPP**
   - Copy `apps/web/dist` to `htdocs/salaries`
   - Copy `apps/api` to appropriate location
   - Set up Apache virtual host

3. **Configure**
   - Update `.htaccess` for routing
   - Configure API base URL in frontend
   - Set up environment variables

## Production Deployment

### Option 1: Standalone Node.js

1. **Build Applications**
   ```bash
   pnpm build
   ```

2. **Start API Server**
   ```bash
   cd apps/api
   pnpm start
   ```

3. **Serve Frontend**
   - Use nginx or Apache to serve `apps/web/dist`
   - Configure reverse proxy to API

### Option 2: Docker (Future)

Docker deployment is not currently configured but could be added.

### Option 3: Cloud Platforms

#### Vercel/Netlify (Frontend Only)

- Frontend can be deployed to Vercel or Netlify
- API would need separate hosting (e.g., Railway, Render)

#### Railway/Render (Full Stack)

- Deploy both API and frontend
- Configure environment variables
- Set up database (PostgreSQL recommended for production)

## Environment Variables

### API (.env in apps/api/)

```env
PORT=3001
NODE_ENV=production
DATABASE_URL="file:./prisma/dev.db"
```

### Web (.env in apps/web/)

```env
VITE_API_BASE_URL=http://localhost:3001
```

## Database Migration

### Development

```bash
cd apps/api
pnpm prisma migrate dev
```

### Production

```bash
cd apps/api
pnpm prisma migrate deploy
```

## Backup Strategy

### SQLite Database

1. **Manual Backup**
   ```bash
   cp apps/api/prisma/dev.db apps/api/prisma/dev.db.backup
   ```

2. **Automated Backup** (cron job)
   ```bash
   # Daily backup
   0 2 * * * cp /path/to/dev.db /path/to/backups/dev.db.$(date +\%Y\%m\%d)
   ```

### Excel Files

- Keep original Excel files in `./Sheets/` directory
- Consider version control or separate backup location

## Security Considerations

### Current State

- No authentication (single-user application)
- File system access limited to `./Sheets/`
- CORS configured for specific origins

### Production Recommendations

1. **Add Authentication**
   - Implement user login
   - Protect API endpoints
   - Secure session management

2. **Secure File Access**
   - Restrict file system access
   - Validate file paths
   - Sanitize file names

3. **Database Security**
   - Use PostgreSQL with proper access controls
   - Encrypt sensitive data
   - Regular backups

4. **HTTPS**
   - Use SSL/TLS certificates
   - Force HTTPS redirects
   - Secure cookies

5. **Input Validation**
   - Validate all user inputs
   - Sanitize file uploads
   - Prevent SQL injection (Prisma handles this)

## Performance Optimization

### Frontend

- Enable gzip compression
- Use CDN for static assets
- Implement caching headers
- Code splitting for routes

### Backend

- Add response caching
- Optimize database queries
- Use connection pooling
- Implement rate limiting

### Database

- Add indexes for common queries
- Regular VACUUM (SQLite)
- Consider PostgreSQL for larger datasets

## Monitoring

### Logging

- API logs to console (consider file logging)
- Error tracking (consider Sentry)
- Performance monitoring

### Health Checks

- `/api/health` endpoint
- Database connection status
- File system access checks

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process
   netstat -ano | findstr :3001
   # Kill process (Windows)
   taskkill /PID <PID> /F
   ```

2. **Database Locked**
   - Ensure only one process accesses database
   - Close Prisma Studio if open
   - Restart API server

3. **Import Fails**
   - Check Excel file format
   - Verify file permissions
   - Check console logs for errors

4. **CORS Errors**
   - Verify API CORS configuration
   - Check frontend API base URL
   - Ensure correct origin in CORS whitelist

## Maintenance

### Regular Tasks

1. **Database Backup**: Daily
2. **Log Rotation**: Weekly
3. **Dependency Updates**: Monthly
4. **Security Patches**: As needed

### Updates

1. **Pull Latest Changes**
   ```bash
   git pull
   ```

2. **Update Dependencies**
   ```bash
   pnpm install
   ```

3. **Run Migrations**
   ```bash
   cd apps/api
   pnpm prisma migrate deploy
   ```

4. **Restart Services**
   - Restart API server
   - Rebuild frontend if needed

## Support

For issues or questions:
- Check documentation in `docs/` directory
- Review error logs
- Check GitHub issues (if applicable)

