# OmegaOps Academy Backend

Production-ready API backend for OmegaOps Academy - a gamified server administration learning platform.

## Overview

This backend provides RESTful APIs for:
- **Missions**: 12-week curriculum with daily learning missions
- **Labs**: Hands-on practice scenarios
- **Knowledge Base**: Interconnected reference documentation
- **Software Tools**: Living database with install/config guides
- **Content Management**: Admin workflow for automated updates

## Architecture

```
src/
├── app.ts                    # Express application entry point
├── api/
│   ├── routes/               # API endpoint handlers
│   │   ├── missions.ts       # Mission CRUD operations
│   │   ├── labs.ts           # Lab scenarios
│   │   ├── knowledge.ts      # Knowledge base topics
│   │   ├── software.ts       # Software tools database
│   │   ├── updates.ts        # Pending updates & changelog
│   │   ├── admin.ts          # Protected admin operations
│   │   ├── progress.ts       # User progress tracking
│   │   └── roadmap.ts        # Curriculum overview
│   ├── controllers/          # Business logic (future)
│   └── middleware/
│       ├── auth.ts           # HTTP Basic Auth for admins
│       └── errorHandler.ts   # Centralized error handling
├── database/
│   ├── db.ts                 # SQLite initialization
│   └── seeds/
│       └── seed.ts           # Sample data seeding
├── services/                 # Business services (future)
├── workers/
│   ├── KnowledgeWorker.ts    # Monitors upstream docs
│   ├── SoftwareDiscoveryWorker.ts  # Discovers new tools
│   └── SoftwareDocWorker.ts  # Generates install guides
├── types/
│   └── index.ts              # TypeScript interfaces
└── utils/
    ├── logger.ts             # Winston logging configuration
    └── validation.ts         # Zod validation schemas
```

## Quick Start

### Prerequisites

- Node.js 18+ (LTS)
- npm 9+

### Installation

```bash
cd /home/metrik/docker/learn/backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your settings (especially ADMIN_PASSWORD!)
nano .env

# Build TypeScript
npm run build

# Start server
npm start
```

### Development Mode

```bash
# Run with ts-node (auto-reload with nodemon recommended)
npm run dev
```

## Configuration

All configuration is via environment variables in `.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./data/omegaops.db
DATABASE_WAL_MODE=true

# Security (CHANGE THESE!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password-here

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=info
LOG_FORMAT=simple
LOG_FILE_PATH=./logs/app.log

# Features
SEED_DATABASE_ON_STARTUP=true
```

See `.env.example` for all available options.

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/roadmap` | 12-week curriculum overview |
| GET | `/api/missions` | List missions (with filtering) |
| GET | `/api/missions/:id` | Get single mission |
| POST | `/api/missions/:id/complete` | Mark mission complete |
| GET | `/api/labs` | List labs (with filtering) |
| GET | `/api/labs/:id` | Get single lab |
| POST | `/api/labs/:id/complete` | Mark lab complete |
| GET | `/api/knowledge` | List knowledge topics |
| GET | `/api/knowledge/:topicId` | Get single topic |
| GET | `/api/software` | List software tools |
| GET | `/api/software/:id` | Get single tool |
| GET | `/api/updates` | List pending updates |
| GET | `/api/updates/changelog` | View changelog |
| GET | `/api/updates/stats` | Update statistics |
| GET | `/api/progress` | Progress tracking template |
| POST | `/api/progress/calculate-level` | Calculate level from XP |
| POST | `/api/progress/validate` | Validate progress data |

### Protected Admin Endpoints

These require HTTP Basic Auth with credentials from `.env`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/pending-updates/:id/approve` | Approve content update |
| POST | `/api/admin/pending-updates/:id/reject` | Reject content update |
| GET | `/api/admin/dashboard` | Admin dashboard stats |

## API Response Format

All endpoints return a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "correlationId": "uuid-for-log-tracing"
}
```

## Testing with curl

### Health Check
```bash
curl http://localhost:3001/health
```

### Get Roadmap
```bash
curl http://localhost:3001/api/roadmap
```

### List Missions (Week 1)
```bash
curl "http://localhost:3001/api/missions?week=1"
```

### Get Single Mission
```bash
curl http://localhost:3001/api/missions/11111111-1111-1111-1111-111111111111
```

### Complete Mission
```bash
curl -X POST http://localhost:3001/api/missions/11111111-1111-1111-1111-111111111111/complete \
  -H "Content-Type: application/json" \
  -d '{"quizScore": 85}'
```

### List Software Tools
```bash
curl "http://localhost:3001/api/software?category=Web%20Server"
```

### Admin: View Pending Updates
```bash
curl http://localhost:3001/api/updates
```

### Admin: Approve Update (requires auth)
```bash
curl -X POST http://localhost:3001/api/admin/pending-updates/update-id/approve \
  -u admin:your-password
```

### Admin: Dashboard
```bash
curl http://localhost:3001/api/admin/dashboard \
  -u admin:your-password
```

## Background Workers

Workers are standalone scripts that run on a schedule:

### Knowledge Worker
Monitors upstream documentation for changes:

```bash
npm run worker:knowledge
# Or: node dist/workers/KnowledgeWorker.js
```

### Software Discovery Worker
Discovers new server administration tools:

```bash
npm run worker:discovery
# Or: node dist/workers/SoftwareDiscoveryWorker.js
```

### Software Documentation Worker
Generates install and config guides:

```bash
npm run worker:docs
# Or: node dist/workers/SoftwareDocWorker.js
```

### Scheduling Workers (cron)

Add to crontab (`crontab -e`):

```cron
# Check for documentation updates daily at 2 AM
0 2 * * * cd /home/metrik/docker/learn/backend && node dist/workers/KnowledgeWorker.js >> logs/workers.log 2>&1

# Discover new tools weekly on Sundays at 3 AM
0 3 * * 0 cd /home/metrik/docker/learn/backend && node dist/workers/SoftwareDiscoveryWorker.js >> logs/workers.log 2>&1

# Generate documentation daily at 4 AM
0 4 * * * cd /home/metrik/docker/learn/backend && node dist/workers/SoftwareDocWorker.js >> logs/workers.log 2>&1
```

## Database

The backend uses SQLite for simplicity and portability. Database features:

- **WAL mode** for better concurrent read performance
- **Indexed columns** for efficient queries
- **JSON fields** stored as TEXT (parsed at application layer)
- **Automatic schema creation** on first startup

### Database Location

Default: `./data/omegaops.db`

Configure via `DATABASE_PATH` in `.env`.

### Seeding

Automatically seeds sample data on startup if `SEED_DATABASE_ON_STARTUP=true`.

Manual seeding:
```bash
npx ts-node src/database/seeds/seed.ts
```

### Schema

Tables:
- `missions` - Learning missions (week/day organized)
- `labs` - Hands-on practice scenarios
- `knowledge_topics` - Reference documentation
- `software_tools` - Tool database with guides
- `pending_updates` - Content update queue
- `changelog` - Audit trail of changes

## Security

### Implemented

- **Helmet.js** for security headers (CSP, HSTS, etc.)
- **CORS** with configurable allowed origins
- **HTTP Basic Auth** for admin routes
- **bcrypt** password hashing (cached)
- **Parameterized queries** (SQL injection prevention)
- **Zod validation** for all inputs
- **Error sanitization** (no stack traces in production)
- **Correlation IDs** for request tracing

### Not Yet Implemented (Production Recommendations)

- Rate limiting (use express-rate-limit)
- JWT token authentication for users
- CSRF protection
- Request size limits (configured but needs enforcement)
- IP allowlisting for admin routes
- Database encryption at rest
- Audit logging to separate system
- Security scanning in CI/CD

## Performance

### Current Optimizations

- SQLite WAL mode for concurrent reads
- Database indexes on frequently queried columns
- JSON parsing with error handling
- Pagination on all list endpoints
- Efficient prepared statements

### Monitoring (Production)

Add these for production:

```bash
npm install express-status-monitor prom-client
```

- CPU/Memory metrics
- Request latency histograms
- Error rate tracking
- Database query performance
- Cache hit ratios

## Deployment

### Docker (Recommended)

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript
COPY dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S omegaops -u 1001

# Create data directory
RUN mkdir -p /app/data /app/logs && \
    chown -R omegaops:nodejs /app

USER omegaops

EXPOSE 3001

CMD ["node", "dist/app.js"]
```

Build and run:

```bash
docker build -t omegaops-backend .
docker run -d \
  -p 3001:3001 \
  -v /path/to/data:/app/data \
  -v /path/to/logs:/app/logs \
  --env-file .env \
  omegaops-backend
```

### systemd Service

Create `/etc/systemd/system/omegaops-backend.service`:

```ini
[Unit]
Description=OmegaOps Academy Backend
After=network.target

[Service]
Type=simple
User=omegaops
WorkingDirectory=/home/metrik/docker/learn/backend
ExecStart=/usr/bin/node dist/app.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=omegaops-backend
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable omegaops-backend
sudo systemctl start omegaops-backend
```

## Troubleshooting

### Server Won't Start

1. Check Node.js version: `node --version` (needs 18+)
2. Verify dependencies: `npm install`
3. Check TypeScript compiled: `npm run build`
4. Verify .env file exists and has required values
5. Check port isn't in use: `lsof -i :3001`

### Database Errors

1. Check database path is writable
2. Delete `data/omegaops.db` to recreate (loses data!)
3. Check disk space: `df -h`

### Authentication Failures

1. Verify ADMIN_USERNAME and ADMIN_PASSWORD in .env
2. Use correct Basic Auth format: `curl -u user:pass`
3. Check logs for auth attempts

### Workers Failing

1. Ensure .env file is accessible to worker scripts
2. Check database path is correct
3. Review worker logs in `logs/` directory

## Development

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Comprehensive inline comments
- File header documentation

### Adding a New Endpoint

1. Create route in `src/api/routes/`
2. Add validation schema in `src/utils/validation.ts`
3. Import and register route in `src/app.ts`
4. Add tests (when implemented)

### Adding a New Worker

1. Create worker in `src/workers/`
2. Follow existing pattern (load env, use logger, handle errors)
3. Add npm script in package.json
4. Document cron schedule

## License

MIT

## Support

For issues or questions:
1. Check this README
2. Review inline code comments
3. Check logs for error details
4. Search existing issues

## Self-Audit Checklist

### Security
- [x] All inputs validated at boundaries (Zod schemas)
- [x] Admin auth with bcrypt hashing
- [x] Security headers via Helmet
- [x] No secrets in logs or responses
- [ ] Rate limiting (TODO for production)

### Performance
- [x] Database indexes on query columns
- [x] Pagination on all list endpoints
- [x] WAL mode for SQLite concurrency
- [ ] Response caching (TODO)
- [ ] Query performance monitoring (TODO)

### UX & Accessibility
- [x] Consistent API response format
- [x] User-friendly error messages
- [x] Correlation IDs for support
- [x] Comprehensive API documentation

### Quality
- [x] TypeScript strict mode
- [x] Detailed inline comments
- [x] README with setup instructions
- [x] .env.example with all options
- [ ] Automated tests (TODO)
- [x] Graceful shutdown handling
