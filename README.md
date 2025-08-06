# Process Analytics System

## Overview

This system processes command outputs from OS tools like `ps` (Unix/Linux) and `tasklist` (Windows), storing structured data that can be queried for research applications. Example research questions include:

- "What is the most commonly used application by law school students running Windows?"
- "What is the average file size of non-system executables on macOS machines?"

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/) installed

### Setup & Run

```bash
# Clone the repository
git clone git@github.com:shirch/process-ingestion.git
cd process-ingestion

# Start all services
docker-compose up --build
```

This starts:

- **NestJS Ingestion Service** (port 3000)
- **PostgreSQL Database** (port 5432)
- **Apache Kafka** (port 9092)
- **Zookeeper** (port 2181)
- **Adminer DB UI** (port 8080)
- **Kafka UI** (port 9000)

### Testing the System

#### 1. Using the Kafka Test Script

```bash
./test/test-kafka.sh
```

#### 2. Direct API Testing

```bash
curl -X POST http://localhost:3000/commands \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-08-05T06:30:00Z",
    "machine_name": "ubuntu-dev-01",
    "machine_id": "machine-001",
    "os_type": "ubuntu",
    "os_version": "Ubuntu 22.04.3 LTS",
    "command": "ps",
    "output": "USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\nroot 1 0.9 0.2 168332 11564 ? Ss 01:10 0:01 /sbin/init splash"
  }'
```

### Accessing UIs

- **Database (Adminer)**: [http://localhost:8080](http://localhost:8080)
  - Server: `postgres`, User: `process_user`, Password: `process_password`, Database: `process_analytics`
- **Kafka UI**: [http://localhost:9000](http://localhost:9000)

### Stopping

```bash
docker-compose down
```

## Architecture & Design

For detailed architecture decisions, scalability considerations, and technical design documentation, see [DESIGN.md](./DESIGN.md).

### Improved Project Structure

```
process-ingestion/
├── src/
│   ├── app.module.ts           # Root module
│   ├── main.ts
│   ├── commands/
│   │   ├── commands.module.ts
│   │   ├── controllers/
│   │   │   └── commands.controller.ts   # HTTP API for ingesting command outputs
│   │   ├── services/
│   │   │   ├── commands.service.ts     # Handles business logic for command ingestion
│   │   │   └── parsing.service.ts      # Parses raw command output into structured process data
│   │   ├── entities/
│   │   │   ├── command.entity.ts
│   │   │   ├── process.entity.ts
│   │   │   └── enums.ts
│   │   └── dto/
│   │       └── ingest-command.dto.ts   # DTO for input validations
│   ├── kafka/
│   │   ├── kafka.module.ts
│   │   └── consumers/
│   │       └── process-commands.consumer.ts   # Kafka consumer
│
├── docker-compose.yml
├── Dockerfile
├── test/
│   └── test-kafka.sh            # Script to send test messages to Kafka
├── README.md
└── DESIGN.md                    # Technical design documentation
```

## Technology Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **Message Broker**: Kafka
- **Containerization**: Docker & Docker Compose
- **Development**: Node.js, TypeScript
