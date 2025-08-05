# Process Ingestion Service

A NestJS-based service for ingesting and storing process data from different operating systems for research analytics.

## Features

- REST API for ingesting process command outputs (ps, tasklist)
- Support for Ubuntu/Mac (ps) and Windows (tasklist) commands
- PostgreSQL database with optimized schema for analytics
- Docker containerization for easy deployment
- TypeScript with full type safety
- Validation with Zod (planned)
- Comprehensive logging (planned)
- Unit and integration tests (planned)

## Quick Start

1. **Clone and setup:**

   ```bash
   git clone <repository>
   cd process-ingestion-service
   ```

2. **Run with Docker:**

   ```bash
   docker-compose up --build
   ```

3. **Test the service:**
   ```bash
   curl http://localhost:3000/health
   ```

## Development

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start database:**

   ```bash
   docker-compose up postgres
   ```

3. **Run development server:**
   ```bash
   npm run start:dev
   ```

## API Endpoints

- `GET /` - Service welcome message
- `GET /health` - Health check endpoint
- `POST /api/commands` - Ingest process commands (coming next)

## Database Schema

### Commands Table

- Stores command execution metadata
- Links to multiple process records
- Keeps raw output for debugging

### Processes Table

- Normalized process data
- Optimized for analytics queries
- Bulk insertion for performance

## Architecture

This service is designed as part of a larger system:

- **Ingestion Flow**: Receives → Parses → Stores process data
- **Query Interface**: Enables research applications to query stored data
- **Scalability**: Ready for Kafka streaming and Snowflake analytics

## Next Steps

1. Define DTOs, entities, and enums
2. Implement command parsing logic
3. Add bulk process insertion
4. Create query endpoints
5. Add comprehensive testing
