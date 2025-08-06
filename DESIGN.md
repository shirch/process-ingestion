# Process Monitoring System Design

## Overview

A system designed to ingest, store, and query process data from multiple operating systems for research purposes. The design covers both high-scale production architecture and simplified implementation for the assignment.

## System Architecture

### High-Scale Production Design

#### Core Components

```
[Data Collectors] -> [Kafka] -> [Processing Workers] -> [Storage Layer] -> [Query Interface]
                                      |
                                 [S3 Storage]
```

#### 1. Ingestion Flow (High Scale)

**Data Collection & Streaming**

- **Kafka** as the message streaming
  - High throughput, fault-tolerant, scalable message streaming
  - Handles large volumes of command outputs from multiple machines
  - Provides durability and replay capabilities for data recovery

- **Amazon S3** for raw command output storage
  - Kafka messages contain S3 object references instead of full text

**Processing Architecture**

- **Kubernetes-based Processing Workers**
  - **Why Kubernetes**: Auto-scaling based on queue depth
  - Parallel processing of command outputs
  - Fault tolerance and resource management
- **Processing Pipeline**:
  1. Consume message from Kafka
  2. Download raw output from S3
  3. Parse command output using OS-specific parsers
  4. Validate and transform data
  5. Bulk insert into databases

#### 2. Storage Layer (High Scale)

**Primary Database - PostgreSQL**

- ACID compliance for data consistency
- Strong indexing capabilities

**Analytics Database - Snowflake**

- Optimized for analytical workloads
- Auto-scaling compute resources
- Time-travel capabilities for historical analysis

**Data Model**:

```sql
-- Commands table (metadata)
commands:
  - id (UUID, PK)
  - timestamp (with timezone, indexed)
  - machine_name, machine_id (indexed)
  - os_type, os_version
  - command_type
  - s3_raw_output_path
  - processed_at
  - content_hash (for idempotency)

-- Processes table (parsed data)
processes:
  - id (UUID, PK)
  - command_id (FK, indexed)
  - pid, process_name (compound index)
  - user (indexed)
  - cpu_percent, memory_percent
  - memory_usage, vsz, rss
  - status, start_time, cpu_time
  - full_command (text search index)
```

**Indexing Strategy**:

- **Composite indexes**: (machine_id, timestamp) for time-series queries
- **Partial indexes**: On active processes only
- **Text search indexes**: On process names and commands using PostgreSQL FTS
- **Hash indexes**: On machine_id and process_name for equality lookups

#### 3. Query Interface (High Scale)

**API Gateway + Microservices**

- **GraphQL API** for flexible research queries
  - **Why GraphQL**: Allows researchers to request exactly the data they need
  - Type-safe schema for process and command data
  - Built-in query optimization and caching

**Caching Layer - Redis**

- **Why Redis**: Fast in-memory caching for frequent queries
- Cache common aggregations and filtered datasets
- Session management for research applications

**Query Optimization**:

- Read replicas for PostgreSQL
- Query result pagination and streaming for large datasets

---

### Assignment Implementation (Simplified)

#### Technology Stack

- **NestJS**: Modern Node.js framework with built-in support
- **Kafka**: Message streaming (simplified single-node setup)
- **PostgreSQL**: Relational database with admin interface
- **Docker**: Containerization for easy development setup

- **TypeORM**: ORM for rapid development with decorators
- **class-validator**: DTO validation

#### Simplified Architecture

```
[File Upload API] -> [Kafka Topic] -> [Consumer Service] -> [PostgreSQL]
```

#### Implementation Decisions

**1. Data Flow Simplification**

- Direct output text on kafka message without S3 integration
- Store raw_output in commands table for debugging
- Single output processing instead of distributed workers
- Keep the same two-table structure (commands, processes)
- Maintain essential indexes for performance
- **NestJS Logger**: Structured logging for debugging and monitoring

#### Testing Strategy

- **Unit Tests**: Parser logic and data transformation
- **Integration Tests**: Database operations and API endpoints
- **E2E Tests**: Full ingestion flow with sample data
- **Performance Tests**: Bulk processing capabilities
