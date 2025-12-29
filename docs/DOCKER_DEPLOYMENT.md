# Docker Deployment Guide for SalariesSummary

This guide explains how to deploy the SalariesSummary application using Docker and Docker Compose.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Building and Running](#building-and-running)
5. [Configuration](#configuration)
6. [Data Persistence](#data-persistence)
7. [Managing the Application](#managing-the-application)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)
10. [Adding More Applications](#adding-more-applications)

---

## Prerequisites

- **Docker** (version 20.10 or later)
- **Docker Compose** (version 2.0 or later)
- **Git** (to clone the repository)
- **Excel workbooks** in the `./Sheets/` directory

### Installing Docker on Ubuntu

If Docker is not installed, follow these steps:

```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
# Or run: newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## Quick Start

1. **Clone or copy the project**
   ```bash
   cd ~
   git clone <repository-url> SalariesSummary
   cd SalariesSummary
   ```

2. **Place Excel files in Sheets directory**
   ```bash
   # Ensure your Excel workbooks are in ./Sheets/
   ls Sheets/
   ```

3. **Start the application**
   ```bash
   docker compose up -d
   ```

4. **Check status**
   ```bash
   docker compose ps
   ```

5. **View logs**
   ```bash
   docker compose logs -f
   ```

6. **Access the application**
   - Web Interface: http://localhost:3000
   - API: http://localhost:3000/api (proxied through nginx)
   - Direct API: http://localhost:3001/api

---

## Project Structure

```
SalariesSummary/
├── docker-compose.yml          # Main Docker Compose configuration
├── .dockerignore              # Files to exclude from Docker builds
├── apps/
│   ├── api/
│   │   ├── Dockerfile         # API container definition
│   │   ├── src/               # API source code
│   │   └── prisma/            # Database schema and migrations
│   └── web/
│       ├── Dockerfile         # Web container definition
│       ├── nginx.conf         # Nginx configuration
│       └── src/               # Frontend source code
└── Sheets/                    # Excel workbooks (mounted as volume)
```

---

## Building and Running

### Build Images

```bash
# Build all services
docker compose build

# Build a specific service
docker compose build salaries-api
docker compose build salaries-web

# Build without cache (for clean rebuild)
docker compose build --no-cache
```

### Start Services

```bash
# Start in detached mode (background)
docker compose up -d

# Start with logs visible
docker compose up

# Start specific services
docker compose up -d salaries-api
docker compose up -d salaries-web
```

### Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes database)
docker compose down -v

# Stop without removing containers
docker compose stop
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart a specific service
docker compose restart salaries-api
```

---

## Configuration

### Environment Variables

You can configure the application using environment variables in `docker-compose.yml`:

```yaml
services:
  salaries-api:
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=file:./prisma/dev.db
```

### Custom Ports

To change the ports, modify `docker-compose.yml`:

```yaml
services:
  salaries-api:
    ports:
      - "8080:3001"  # Change 8080 to your desired port
  salaries-web:
    ports:
      - "8081:80"    # Change 8081 to your desired port
```

### CORS Configuration

If accessing from a different domain, update CORS in `apps/api/src/index.ts`:

```typescript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://your-domain.com',
    'http://your-server-ip:3000'
  ],
  credentials: true
};
```

Then rebuild:
```bash
docker compose build salaries-api
docker compose up -d salaries-api
```

---

## Data Persistence

### Volumes

The application uses Docker volumes to persist data:

1. **`salaries-db`**: SQLite database
   - Location: `/var/lib/docker/volumes/salaries-summary_salaries-db/_data`
   - Contains: `dev.db` and migration files

2. **`salaries-uploads`**: Temporary uploads
   - Location: `/var/lib/docker/volumes/salaries-summary_salaries-uploads/_data`

3. **`./Sheets`**: Excel workbooks (bind mount)
   - Location: `./Sheets/` in your project directory
   - Mounted as read-only (`:ro`)

### Backup Database

```bash
# Backup the database volume
docker run --rm \
  -v salaries-summary_salaries-db:/data \
  -v $(pwd)/backups:/backup \
  ubuntu tar czf /backup/db-backup-$(date +%Y%m%d).tar.gz /data

# Or copy directly
docker cp salaries-api:/app/prisma/dev.db ./backups/dev.db.backup
```

### Restore Database

```bash
# Restore from backup
docker cp ./backups/dev.db.backup salaries-api:/app/prisma/dev.db
docker compose restart salaries-api
```

---

## Managing the Application

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f salaries-api
docker compose logs -f salaries-web

# Last 100 lines
docker compose logs --tail=100

# Since specific time
docker compose logs --since 10m
```

### Execute Commands in Containers

```bash
# Run Prisma commands
docker compose exec salaries-api npx prisma studio
docker compose exec salaries-api npx prisma migrate deploy

# Access shell
docker compose exec salaries-api sh
docker compose exec salaries-web sh

# Run one-off commands
docker compose exec salaries-api npm run prisma:generate
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose build
docker compose up -d

# Or force recreate
docker compose up -d --force-recreate
```

### Check Resource Usage

```bash
# Container stats
docker stats

# Specific container
docker stats salaries-api salaries-web

# Disk usage
docker system df
```

---

## Troubleshooting

### Containers Won't Start

1. **Check logs**
   ```bash
   docker compose logs
   ```

2. **Check container status**
   ```bash
   docker compose ps
   ```

3. **Verify ports are available**
   ```bash
   sudo netstat -tulpn | grep -E '3000|3001'
   ```

### Database Issues

1. **Reset database** (⚠️ deletes all data)
   ```bash
   docker compose down -v
   docker compose up -d
   docker compose exec salaries-api npx prisma migrate deploy
   ```

2. **Check database file**
   ```bash
   docker compose exec salaries-api ls -la /app/prisma/
   ```

### Puppeteer/PDF Generation Issues

1. **Check Chromium installation**
   ```bash
   docker compose exec salaries-api chromium --version
   ```

2. **Verify environment variables**
   ```bash
   docker compose exec salaries-api env | grep PUPPETEER
   ```

### Network Issues

1. **Check network connectivity**
   ```bash
   docker compose exec salaries-web ping salaries-api
   ```

2. **Inspect network**
   ```bash
   docker network inspect salaries-summary_salaries-network
   ```

### Permission Issues

1. **Fix file permissions**
   ```bash
   sudo chown -R $USER:$USER ./Sheets
   ```

2. **Check volume permissions**
   ```bash
   docker compose exec salaries-api ls -la /app/prisma/
   ```

### Rebuild Everything

```bash
# Stop and remove everything
docker compose down -v

# Remove images
docker compose rm -f
docker rmi salaries-summary-salaries-api salaries-summary-salaries-web

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

---

## Production Deployment

### Security Considerations

1. **Use environment variables file**
   ```bash
   # Create .env file
   cat > .env << EOF
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=file:./prisma/dev.db
   EOF
   ```

2. **Update docker-compose.yml to use .env**
   ```yaml
   services:
     salaries-api:
       env_file:
         - .env
   ```

3. **Use HTTPS** (set up reverse proxy with SSL)
   - Use nginx or Traefik as reverse proxy
   - Obtain SSL certificates (Let's Encrypt)

4. **Restrict network access**
   ```yaml
   services:
     salaries-api:
       ports:
         - "127.0.0.1:3001:3001"  # Only accessible from localhost
   ```

### Reverse Proxy Setup (Nginx on Host)

```nginx
# /etc/nginx/sites-available/salaries
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
services:
  salaries-api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### Auto-restart Policy

Already configured with `restart: unless-stopped`, but you can also use:

```yaml
restart: always  # Always restart, even after Docker daemon restart
```

---

## Adding More Applications

### Example: Adding a Second Application

1. **Create Dockerfiles** for the new app
2. **Add to docker-compose.yml**:

```yaml
services:
  # ... existing services ...
  
  app2-api:
    build:
      context: ./app2/api
      dockerfile: Dockerfile
    container_name: app2-api
    ports:
      - "3002:3002"
    networks:
      - salaries-network
    # ... other configuration ...
  
  app2-web:
    build:
      context: ./app2/web
      dockerfile: Dockerfile
    container_name: app2-web
    ports:
      - "3003:80"
    depends_on:
      - app2-api
    networks:
      - salaries-network
    # ... other configuration ...
```

3. **Start all services**
   ```bash
   docker compose up -d
   ```

### Separate docker-compose Files

For better organization, use multiple compose files:

```bash
# docker-compose.yml (base)
# docker-compose.salaries.yml
# docker-compose.app2.yml

# Start specific services
docker compose -f docker-compose.yml -f docker-compose.salaries.yml up -d
```

---

## Monitoring and Maintenance

### Health Checks

Health checks are already configured. Monitor them:

```bash
# Check health status
docker compose ps

# View health check logs
docker inspect salaries-api | grep -A 10 Health
```

### Regular Maintenance Tasks

1. **Clean up unused resources**
   ```bash
   docker system prune -a
   ```

2. **Update images**
   ```bash
   docker compose pull
   docker compose up -d
   ```

3. **Monitor disk usage**
   ```bash
   docker system df -v
   ```

4. **Backup regularly**
   - Set up cron job for database backups
   - Backup volumes periodically

---

## Quick Reference Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart

# View logs
docker compose logs -f

# Rebuild
docker compose build --no-cache
docker compose up -d

# Execute command
docker compose exec salaries-api <command>

# Check status
docker compose ps

# View resource usage
docker stats

# Clean up
docker system prune -a
```

---

## Support

For issues:
1. Check logs: `docker compose logs`
2. Check container status: `docker compose ps`
3. Review this guide's troubleshooting section
4. Check Docker documentation: https://docs.docker.com/

---

**Last Updated**: 2024
**Docker Version**: 20.10+
**Docker Compose Version**: 2.0+

