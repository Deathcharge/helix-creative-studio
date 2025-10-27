# 🚀 Deployment Guide

## Manus Platform (Current)

The Helix Creative Studio is currently deployed on the Manus AI Platform:

**Live URL**: [https://helixstudio-ggxdwcud.manus.space](https://helixstudio-ggxdwcud.manus.space)

### Manus Deployment Features
- ✅ Automatic SSL certificates
- ✅ Built-in authentication (Manus OAuth)
- ✅ Database provisioning (MySQL/TiDB)
- ✅ Environment variable management
- ✅ One-click rollback to previous checkpoints
- ✅ Real-time preview and hot reload

### Updating Manus Deployment

1. Make changes to the codebase
2. Test locally with `pnpm dev`
3. Save checkpoint using Manus UI
4. Click **Publish** button in Management UI
5. Deployment happens automatically

## Railway Deployment

### Prerequisites
- Railway account
- GitHub repository connected
- Database provisioned (MySQL/PostgreSQL)

### Setup Steps

1. **Create new Railway project**
   ```bash
   railway login
   railway init
   ```

2. **Add MySQL database**
   ```bash
   railway add mysql
   ```

3. **Set environment variables**
   ```bash
   railway variables set DATABASE_URL=$DATABASE_URL
   railway variables set JWT_SECRET=$(openssl rand -hex 32)
   railway variables set BUILT_IN_FORGE_API_KEY=your-api-key
   # ... add other variables from .env.example
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Run migrations**
   ```bash
   railway run pnpm db:push
   ```

### Railway Configuration

Create `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t helix-creative-studio .
```

### Run Container

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@host:3306/db" \
  -e JWT_SECRET="your-secret" \
  -e BUILT_IN_FORGE_API_KEY="your-key" \
  helix-creative-studio
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://root:password@db:3306/helix
      - JWT_SECRET=${JWT_SECRET}
      - BUILT_IN_FORGE_API_KEY=${BUILT_IN_FORGE_API_KEY}
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=helix
    volumes:
      - db_data:/var/lib/mysql

volumes:
  db_data:
```

Run with:
```bash
docker-compose up -d
```

## Vercel Deployment

**Note**: Vercel requires serverless-compatible setup. The current tRPC + Express architecture needs adaptation.

### Alternative: Vercel + Serverless Functions

1. Refactor Express routes to Vercel serverless functions
2. Use Vercel Postgres or external database
3. Deploy:
   ```bash
   vercel --prod
   ```

## Environment Variables Reference

### Required
- `DATABASE_URL` — MySQL/PostgreSQL connection string
- `JWT_SECRET` — Session signing secret (32+ characters)
- `BUILT_IN_FORGE_API_KEY` — LLM API key

### OAuth (Manus Platform)
- `OAUTH_SERVER_URL` — OAuth backend URL
- `VITE_OAUTH_PORTAL_URL` — OAuth frontend URL
- `VITE_APP_ID` — OAuth application ID
- `OWNER_OPEN_ID` — Owner's OAuth ID
- `OWNER_NAME` — Owner's display name

### Optional
- `VITE_APP_TITLE` — Application title (default: "Helix Creative Studio")
- `VITE_APP_LOGO` — Logo URL
- `VITE_ANALYTICS_ENDPOINT` — Analytics endpoint
- `VITE_ANALYTICS_WEBSITE_ID` — Analytics site ID

## Database Migrations

### Initial Setup
```bash
pnpm db:push
```

### Schema Changes
1. Edit `drizzle/schema.ts`
2. Generate migration:
   ```bash
   pnpm db:push
   ```
3. Verify in database

### Rollback
Use Drizzle Studio to inspect and manually rollback:
```bash
pnpm drizzle-kit studio
```

## Monitoring

### Health Check Endpoint
```bash
curl https://your-domain.com/api/health
```

### Database Connection
```bash
curl https://your-domain.com/api/trpc/system.health
```

### Logs
- **Manus**: View in Management UI → Dashboard
- **Railway**: `railway logs`
- **Docker**: `docker logs <container-id>`

## Troubleshooting

### Database Connection Issues
1. Verify `DATABASE_URL` format
2. Check database server is running
3. Ensure SSL is enabled (add `?ssl=true` to connection string)

### OAuth Errors
1. Verify `OAUTH_SERVER_URL` and `VITE_OAUTH_PORTAL_URL`
2. Check `JWT_SECRET` is set
3. Ensure `VITE_APP_ID` matches OAuth application

### Build Failures
1. Clear node_modules: `rm -rf node_modules && pnpm install`
2. Clear build cache: `rm -rf dist .vite`
3. Check Node.js version: `node --version` (requires 22+)

## Performance Optimization

### Production Build
```bash
pnpm build
```

### Enable Compression
Add to `server/index.ts`:
```typescript
import compression from 'compression';
app.use(compression());
```

### Database Indexing
Add indexes for frequently queried fields in `drizzle/schema.ts`:
```typescript
export const stories = mysqlTable("stories", {
  // ... fields
}, (table) => ({
  ritualIdIdx: index("ritual_id_idx").on(table.ritualId),
  userIdIdx: index("user_id_idx").on(table.userId),
}));
```

## Security Checklist

- [ ] Environment variables stored securely
- [ ] Database uses SSL connections
- [ ] JWT secret is strong (32+ characters)
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Drizzle ORM)
- [ ] XSS protection (React escapes by default)

## Related Deployments

- **Helix AI Dashboard**: [https://helixai-e9vvqwrd.manus.space](https://helixai-e9vvqwrd.manus.space)
- **Helix Sync Portal**: [https://helixsync-unwkcsjl.manus.space](https://helixsync-unwkcsjl.manus.space)

---

*For questions or issues, open an issue on [GitHub](https://github.com/Deathcharge/helix-creative-studio/issues).*

