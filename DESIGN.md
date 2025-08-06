# Process Monitoring System Design

## Overview

A system designed to ingest, store, and query process data from multiple operating systems for research purposes. The design covers both high-scale production architecture and simplified implementation for the assignment.

## System Architecture

### High-Scale Production Design

For detailed visual representations of the system architecture, see the comprehensive [Mermaid Architecture Diagrams](https://www.mermaidchart.com/app/projects/fe471217-3662-49dc-a088-14315a8a98e6/diagrams/ea4985b8-a402-4f65-b15d-482d02ccdb1b/version/v0.1/edit)

#### 1. Ingestion Flow (High Scale)

**Data Collection & Streaming**

- **Kafka** as the message streaming
  - High throughput, fault-tolerant, scalable message streaming
  - Handles large volumes of command outputs from multiple machines
  - Provides durability and replay capabilities for data recovery

- **Amazon S3** for raw command output storage
  - Kafka messages contain S3 object references instead of full text

- **Idempotency Strategy**
  - Content hash (SHA-256) of raw command output included in each message
  - Database unique constraint on (machine_id, timestamp, content_hash)
  - Duplicate detection at ingestion service level prevents reprocessing
  - Kafka message deduplication using producer idempotency features

**Processing Architecture**

- **Horizontally Scalable Ingestion Services**
  - Multiple service instances for high availability and throughput
  - Load balancing across Kafka consumer groups
  - Multiple workers if needed for the processing of the output and parsing
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
  - machine_name
  - machine_id (indexed)
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
  - full_command
  ...
```

**Indexing Strategy**:

- **Composite indexes**: (machine_id, timestamp) for time-series queries

#### 3. Query Interface (High Scale)

**API Gateway + Microservices**

- **GraphQL API** for flexible research queries
  - Allows researchers to request exactly the data they need
  - Type-safe schema for process and command data
  - Built-in query optimization and caching

**Caching Layer - Redis**

- Fast in-memory caching for frequent queries
- Cache common aggregations and filtered datasets
- Session management for research applications

**Query Optimization**:

- Read replicas for PostgreSQL
- Query result pagination and streaming for large datasets

---

### Assignment Implementation (Simplified)

For detailed visual representations of the system architecture, see the comprehensive [Mermaid Architecture Diagrams](https://www.mermaidchart.com/app/projects/fe471217-3662-49dc-a088-14315a8a98e6/diagrams/57ad12aa-586e-416e-b613-4c645561b425/version/v0.1/edit)

#### Technology Stack

- **NestJS**: Modern Node.js framework with built-in support
- **Kafka**: Message streaming (simplified single-node setup)
- **PostgreSQL**: Relational database with admin interface
- **Docker**: Containerization for easy development setup

#### Development Tools

- **TypeORM**: ORM for rapid development with decorators
- **class-validator**: DTO validation

## Implementation Decisions

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
