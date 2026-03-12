# Sanjeevani Backend - Setup Guide

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Redis 7+ installed and running

### Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   # Minimum required:
   # - DATABASE_URL
   # - REDIS_URL
   # - JWT_SECRET
   ```

3. **Initialize Database**
   ```bash
   npm run setup-db
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Test the API**
   ```bash
   # Visit http://localhost:3000
   # API is available at http://localhost:3000/api
   ```

## Detailed Configuration

### Database Setup (PostgreSQL)

1. **Create Database**
   ```sql
   CREATE DATABASE sanjeevani;
   CREATE USER sanjeevani_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE sanjeevani TO sanjeevani_user;
   ```

2. **Update .env**
   ```
   DATABASE_URL="postgresql://sanjeevani_user:your_password@localhost:5432/sanjeevani"
   ```

3. **Run Schema Migration**
   ```bash
   npm run setup-db
   ```

### Redis Setup

1. **Install Redis**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt install redis-server
   sudo systemctl start redis
   
   # Windows
   # Download from: https://github.com/microsoftarchive/redis/releases
   ```

2. **Update .env**
   ```
   REDIS_URL="redis://localhost:6379"
   ```

3. **Test Redis**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

## Testing the Backend

### Using Frontend Pages

The frontend is already set up to work with the backend. Just navigate to:
- Login: `http://localhost:3000/login`
- Patient Dashboard: `http://localhost:3000/patient/dashboard`
- Doctor Dashboard: `http://localhost:3000/doctor/dashboard`

### Using API Directly

1. **Register a User**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "patient@test.com",
       "password": "password123",
       "role": "patient",
       "name": "Test Patient"
     }'
   ```

2. **Login**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "patient@test.com",
       "password": "password123",
       "role": "patient"
     }'
   ```

3. **Get Dashboard (with auth token)**
   ```bash
   curl -X GET http://localhost:3000/api/patient/dashboard \
     -H "Cookie: auth-token=YOUR_TOKEN_HERE"
   ```

## Low Bandwidth Optimization Features

### 1. Field Selection
Request only the fields you need:
```bash
# Instead of full profile
curl http://localhost:3000/api/profile

# Request specific fields only
curl "http://localhost:3000/api/profile?fields=id,name,email"
```

### 2. ETag Caching
Automatic 304 Not Modified responses:
```bash
# First request
curl -v http://localhost:3000/api/patient/dashboard
# Note the ETag header

# Subsequent request with ETag
curl -v http://localhost:3000/api/patient/dashboard \
  -H "If-None-Match: <etag-value>"
# Returns 304 if data hasn't changed
```

### 3. Pagination
Limit data transfer with pagination:
```bash
# Get appointments with pagination
curl "http://localhost:3000/api/appointments?page=1&limit=10"
```

### 4. Active Filters
Filter server-side to reduce payload:
```bash
# Get only active medications
curl "http://localhost:3000/api/medications?active=true"
```

## Performance Monitoring

### Cache Hit Rate
Check Redis to see cache effectiveness:
```bash
redis-cli INFO stats | grep hits
```

### Database Performance
Monitor query times in development logs.

### Response Sizes
All responses are compressed when > 1KB.
Average response sizes: 200-500 bytes (compressed)

## Production Deployment

### Environment Variables
Update these for production:
```env
NODE_ENV=production
DATABASE_URL=<production-db-url>
REDIS_URL=<production-redis-url>
JWT_SECRET=<strong-random-secret>
```

### Database Migration
```bash
NODE_ENV=production npm run setup-db
```

### Start Production Server
```bash
npm run build
npm start
```

## API Documentation

Detailed API documentation is available in `BACKEND_README.md`

Key endpoints:
- Authentication: `/api/auth/*`
- Profile: `/api/profile`
- Dashboard: `/api/{patient|doctor}/dashboard`
- Appointments: `/api/appointments`
- AI Assistant: `/api/assistant`
- Reports: `/api/reports`
- Medications: `/api/medications`
- Queue (Doctor): `/api/doctor/queue`

## Troubleshooting

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Make sure PostgreSQL is running
```bash
# Check status
pg_ctl status

# Start PostgreSQL
pg_ctl start
```

### Redis Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Make sure Redis is running
```bash
# Check status
redis-cli ping

# Start Redis
redis-server
```

### JWT Token Invalid
```
Error: Unauthorized
```
**Solution**: Make sure:
1. You're logged in
2. JWT_SECRET matches between requests
3. Token hasn't expired (default: 7 days)

## Development Tips

### Hot Reload
The server automatically reloads on file changes in development mode.

### Database Reset
To reset the database:
```bash
# Drop and recreate database
dropdb sanjeevani
createdb sanjeevani
npm run setup-db
```

### Clear Cache
To clear Redis cache:
```bash
redis-cli FLUSHALL
```

## Next Steps

1. ✅ Backend is ready!
2. Connect frontend to API endpoints
3. Test with low bandwidth conditions
4. Deploy to production

## Support

For issues or questions:
- Check `BACKEND_README.md` for detailed API docs
- Review code comments in `/src/lib/*` for implementation details
- Check server logs for debugging information
