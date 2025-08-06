# Process Analytics System - Design Document

This document outlines the design of a scalable process analytics system that ingests process data from various operating systems (Ubuntu, macOS, Windows) and provides a queryable interface for research applications. The system is designed to handle large-scale data ingestion while maintaining performance and enabling complex analytical queries.

## System Overview

The Process Analytics System enables researchers to generate insights on processes running across different operating systems. It supports queries such as:

- "What is the most commonly used application by law school students running Windows?"
- "What is the average file size of non-system executables on macOS machines?"

## Architecture Design

### Full-Scale Production Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA COLLECTION LAYER                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    Store Output Files     ┌──────────────────────────────┐ │
│  │ Data Collection │ ────────────────────────> │        Amazon S3             │ │
│  │     Team        │                           │    Raw Data Storage          │ │
│  │ (ps, tasklist)  │                           │                              │ │
│  └─────────────────┘                           └──────────────────────────────┘ │
│           │                                                     │               │
│           │ Metadata + S3 URL                                   │               │
│           ▼                                                     │               │
│  ┌────────────────────────────────────────────────────────┐     |               │
│  │                Apache Kafka Cluster                    │     |               │
│  │              Event Streaming Platform                  │     |               │
│  └────────────────────────────────────────────────────────┘     |               │
└─────────────────────────────────────────────────────────────────|-──────────────┘
                                                                  │
┌─────────────────────────────────────────────────────────────────┼───────────────┐
│                         INGESTION & PROCESSING LAYER            │               │
├─────────────────────────────────────────────────────────────────┼───────────────┤
│                                                                 ▼               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                    NestJS Kafka Consumer                                    ││
│  │                   TypeScript Service                                        ││
│  │              Command Parsing & Data Processing                              ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                              │                    │                             │
│                              │ Bulk Insert        │ Nightly ETL                 │
│                              ▼                    ▼                             │
│  ┌─────────────────────────────────┐    ┌──────────────────────────────────────┐│
│  │         PostgreSQL              │    │           Snowflake                   ││
│  │      Operational Store          │    │       Analytics Warehouse            ││
│  │     30-day Hot Data             │    │       Historical Data                ││
│  └─────────────────────────────────┘    └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┬───────────────┘
                                                                  │
┌─────────────────────────────────────────────────────────────────┼───────────────┐
│                           QUERY INTERFACE LAYER                 │               │
├─────────────────────────────────────────────────────────────────┼───────────────┤
│                                                                 ▼               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                      NestJS Query API                                       ││
│  │                   REST + GraphQL Endpoints                                  ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                              │                    │                             │
│                              ▼                    ▼                             │
│  ┌─────────────────────────────────┐    ┌──────────────────────────────────────┐│
│  │    Model Context Protocol       │    │      Research Applications           ││
│  │       (MCP Interface)           │    │     Custom Dashboards                ││
│  │      LLM Integration            │    │                                      ││
│  └─────────────────────────────────┘    └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┬───────────────┘
                                                                  │
┌─────────────────────────────────────────────────────────────────┼───────────────┐
│                              RESEARCH TEAMS                     │               │
├─────────────────────────────────────────────────────────────────┼───────────────┤
│                              │                    │             ▼               │
│  ┌─────────────────────────────────┐    ┌──────────────────────────────────────┐│
│  │        Research Team            │    │       Analytics Applications         ││
│  │   Natural Language Queries      │    │      Dashboards & Reports            ││
│  │     Direct LLM Integration      │    │                                      ││
│  └─────────────────────────────────┘    └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DOCKER ENVIRONMENT                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐                                                            │
│  │ Data Collection │                                                            │
│  │     Team        │                                                            │
│  │ Command Output  │                                                            │
│  └─────────────────┘                                                            │
│           │                                                                     │
│           │ JSON Messages                                                       │
│           ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                     Apache Kafka (Single Node)                              ││
│  │                    process-commands topic                                   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│           │                                                                     │
│           │ Kafka Messages                                                      │
│           ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                      NestJS Ingestion Service                               ││
│  │                                                                             ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│           │                              │                                      │
│           │ Bulk Insert                  │ Health Checks                        │
│           ▼                              ▼                                      │
│  ┌─────────────────────────────────┐    ┌──────────────────────────────────────┐│
│  │         PostgreSQL              │    │        Health Endpoints             ││
│  │    Commands + Processes         │    │         Monitoring                  ││
│  │      Two-Table Schema           │    │                                      ││
│  └─────────────────────────────────┘    └──────────────────────────────────────┘│
│           │                                                                     │
│           │ SQL Queries                                                         │
│           ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                     Adminer Web UI                                        ││
│  │                   Database Viewer                                          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Technology Decisions

### Framework Choice: NestJS

**Decision**: Use NestJS as the primary framework for both ingestion and API services.

**Reasoning**:

- **Scalability**: Built-in microservices support with multiple transport layers (Kafka, Redis, etc.)
- **TypeScript First**: Strong typing ensures data integrity and reduces runtime errors
- **Dependency Injection**: Clean architecture with testable, modular components
- **Ecosystem**: Rich ecosystem with built-in support for databases, validation, documentation
- **Enterprise Ready**: Proven in production environments with good monitoring and logging support

### Data Storage Strategy

#### Primary Storage: PostgreSQL

**Decision**: Use PostgreSQL for operational data storage with a two-table normalized structure.

**Database Schema**:

```sql
-- Commands Table: Metadata and raw preservation
CREATE TABLE commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    machine_name VARCHAR(255) NOT NULL,
    machine_id VARCHAR(255) NOT NULL,
    os_type process_os_type NOT NULL,
    os_version VARCHAR(100) NOT NULL,
    command_type process_command_type NOT NULL,
    raw_output TEXT NOT NULL,  -- Preserved for debugging/reprocessing
    process_count INTEGER DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes for performance
    INDEX idx_commands_machine_timestamp (machine_id, timestamp),
    INDEX idx_commands_os_command (os_type, command_type),
    INDEX idx_commands_timestamp (timestamp)
);

-- Processes Table: Normalized analytical data
CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    command_id UUID REFERENCES commands(id) ON DELETE CASCADE,
    pid INTEGER NOT NULL,
    process_name VARCHAR(500) NOT NULL,
    user_name VARCHAR(100),
    cpu_percent DECIMAL(5,2),
    memory_percent DECIMAL(5,2),
    memory_usage VARCHAR(50),
    virtual_memory_size BIGINT,
    resident_set_size BIGINT,
    tty VARCHAR(20),
    status process_status DEFAULT 'unknown',
    start_time TIME,
    cpu_time TIME,
    session_name VARCHAR(50),
    session_id INTEGER,
    full_command TEXT,

    -- Indexes for analytical queries
    INDEX idx_processes_command_pid (command_id, pid),
    INDEX idx_processes_name (process_name),
    INDEX idx_processes_user (user_name),
    INDEX idx_processes_status (status)
);
```

**Key Design Decisions**:

1. **Two-Table Structure**: Separates metadata from process records for optimal query performance
2. **Raw Output Preservation**: Maintains original command output for debugging and data lineage
3. **Bulk Insertion Strategy**: Processes are inserted in batches to minimize database round-trips
4. **Strategic Indexing**: Indexes designed for common analytical query patterns

#### Analytics Storage: Snowflake (Production)

**Decision**: Use Snowflake for large-scale analytics and historical data.

**Implementation Strategy**:

- **Data Pipeline**: Nightly batch exports from PostgreSQL to Snowflake
- **Retention Policy**: Keep 30 days of hot data in PostgreSQL, archive to Snowflake
- **Query Optimization**: Snowflake's columnar storage optimized for analytical workloads
- **Cost Management**: Automatic scaling and pay-per-use model

### Event Streaming: Apache Kafka

**Production Decision**: Use Kafka for reliable, scalable message streaming.

**Benefits**:

- **Fault Tolerance**: Built-in replication and durability guarantees
- **Scalability**: Horizontal scaling with topic partitioning
- **Decoupling**: Producers and consumers operate independently
- **Retention**: Configurable message retention for replay capabilities

**Implementation Simplification**:
For the current implementation, we use a single-node Kafka setup to reduce infrastructure complexity while maintaining the same API contracts.

### Large File Handling: Amazon S3 (Production)

**Production Strategy**: For large command outputs (>1MB), use S3 URLs instead of direct message payloads.

**Message Structure**:

```json
{
  "timestamp": "2025-08-05T06:30:00Z",
  "machine_name": "prod-server-01",
  "machine_id": "server-001",
  "os_type": "ubuntu",
  "os_version": "Ubuntu 22.04.3 LTS",
  "command": "ps",
  "output_type": "s3_url",
  "output": "s3://process-data/2025/08/05/server-001-ps-143022.txt"
}
```

**Implementation Simplification**:
Current implementation includes output directly in Kafka messages for development simplicity.

### Query Interface: REST API + MCP

**Decision**: Provide multiple query interfaces for different use cases.

#### REST API for Applications

```typescript
// Example endpoints
GET /api/analytics/processes/top-by-cpu?os_type=ubuntu&limit=10
GET /api/analytics/machines/{machine_id}/utilization?date_range=7d
POST /api/analytics/query (Custom analytical queries)
```

#### Model Context Protocol (MCP) for Research Teams

**Decision**: Expose data through MCP for direct LLM integration.

**Benefits**:

- **Natural Language Queries**: Researchers can ask questions in plain English
- **Context Awareness**: LLMs can understand data relationships and provide insights
- **Rapid Prototyping**: Faster development of research applications

### Containerization: Docker

**Decision**: Use Docker for development and deployment consistency.

**Benefits**:

- **Environment Consistency**: Identical development and production environments
- **Dependency Management**: All services and dependencies packaged together
- **Scalability**: Easy horizontal scaling with orchestration platforms
- **Development Velocity**: Quick setup for new team members

## Data Flow Architecture

### Ingestion Flow

```
Data Collection → Kafka Topic → NestJS Consumer → PostgreSQL
                                      ↓
                              Command Parsing Service
                                      ↓
                              Bulk Process Insertion
                                      ↓
                              Raw Output Preservation
```

**Step-by-Step Process**:

1. **Data Collection**: External team collects process data using OS commands (`ps`, `tasklist`)
2. **Message Publishing**: Metadata + output published to Kafka topic
3. **Stream Processing**: NestJS consumer processes messages in real-time
4. **Data Parsing**: Command output parsed into structured process records
5. **Bulk Storage**: Batch insertion of processes for optimal performance
6. **Raw Preservation**: Original output stored for debugging and reprocessing

### Query Flow

```
API Request → Query Service → Data Source Selection → Query Execution → Response
                                  ↓
                          PostgreSQL / Snowflake
                                  ↓
                            Indexed Retrieval
                                  ↓
                           Response Formatting
```

**Query Process**:

1. **API Request**: Research applications submit queries via REST or MCP
2. **Query Optimization**: Service determines optimal data source (PostgreSQL vs Snowflake)
3. **Data Retrieval**: Execute optimized queries with proper indexing
4. **Response Formatting**: Return data in requested format (JSON, CSV, etc.)
5. **Caching**: Cache frequent queries for improved performance

## Performance Considerations

### Bulk Processing Strategy

**Implementation**: Process records are inserted in batches rather than individually.

```typescript
// Bulk insertion example
async ingestCommand(dto: IngestCommandDto): Promise<Command> {
  const command = await this.commandRepository.save(commandEntity);
  const processes = await this.parseProcesses(dto.output, command.id);

  // Bulk insert all processes at once
  await this.processRepository.save(processes); // Single transaction

  return command;
}
```

**Benefits**:

- **Reduced Database Load**: Fewer round-trips and transactions
- **Improved Throughput**: Higher messages per second processing
- **Transaction Efficiency**: Single transaction per command batch

### Indexing Strategy

**Primary Indexes**:

- **Temporal Queries**: `(machine_id, timestamp)` for time-series analysis
- **Process Analysis**: `(process_name)` for application usage patterns
- **Resource Queries**: `(user_name, cpu_percent)` for utilization analysis

**Index Usage Examples**:

```sql
-- Common query patterns supported by indexes
SELECT * FROM processes
WHERE process_name = 'chrome'
AND command_id IN (
    SELECT id FROM commands
    WHERE machine_id = 'server-001'
    AND timestamp >= '2025-08-01'
);
```

## Implementation Decisions

### Production vs. Implementation Trade-offs

| Component           | Production Solution      | Implementation Solution | Reasoning                                                             |
| ------------------- | ------------------------ | ----------------------- | --------------------------------------------------------------------- |
| **Message Broker**  | Multi-node Kafka cluster | Single Kafka node       | Reduces infrastructure complexity while maintaining API compatibility |
| **Large Files**     | S3 URLs in messages      | Direct message payloads | Eliminates S3 setup overhead for development                          |
| **Analytics Store** | PostgreSQL + Snowflake   | PostgreSQL only         | Single database simplifies development setup                          |
| **API Layer**       | Separate query service   | Combined service        | Reduces microservice overhead in development                          |
| **Monitoring**      | Full observability stack | Basic health checks     | Focuses on core functionality demonstration                           |

### Scaling Path

**Phase 1 (Current)**: Single-node development setup

- ✅ Kafka consumer pattern established
- ✅ Database schema optimized for scale
- ✅ Bulk processing implemented
- ✅ Docker containerization

**Phase 2 (Production)**: Horizontal scaling

- 🔄 Multi-node Kafka cluster
- 🔄 S3 integration for large files
- 🔄 Separate ingestion and query services
- 🔄 Load balancing and auto-scaling

**Phase 3 (Enterprise)**: Advanced analytics

- 🔄 Snowflake data warehouse
- 🔄 MCP protocol implementation
- 🔄 Machine learning pipelines
- 🔄 Advanced monitoring and alerting

## Data Structure Deep Dive

### Commands Table Design

**Purpose**: Store command execution metadata and preserve raw output

**Key Fields**:

- `raw_output`: Complete original command output for debugging
- `process_count`: Denormalized count for quick statistics
- `machine_id` + `timestamp`: Composite key for time-series queries

### Processes Table Design

**Purpose**: Normalized process data optimized for analytical queries

**Cross-Platform Fields**:

- `process_name`: Executable name (consistent across OS)
- `pid`: Process identifier (universal)
- `user_name`: Process owner (varies by OS)

**OS-Specific Fields**:

- **Unix/Linux**: `tty`, `cpu_percent`, `memory_percent`
- **Windows**: `session_name`, `session_id`, `memory_usage`

### Parsing Strategy

**Command-Specific Parsers**:

```typescript
// ps auxww format: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
private parsePsOutput(output: string): ProcessRecord[] {
  const lines = output.trim().split('\n').slice(1); // Skip header
  return lines.map(line => {
    const parts = line.split(/\s+/, 11);
    return {
      user: parts[0],
      pid: parseInt(parts[1]),
      cpu_percent: parseFloat(parts[2]),
      memory_percent: parseFloat(parts[3]),
      // ... additional fields
    };
  });
}

// tasklist format: ImageName PID SessionName Session# MemUsage
private parseTasklistOutput(output: string): ProcessRecord[] {
  // Windows-specific parsing logic
}
```

## Monitoring and Observability

### Application Metrics

- **Throughput**: Messages processed per second
- **Latency**: End-to-end processing time
- **Error Rates**: Failed message processing percentage
- **Queue Depth**: Kafka consumer lag

### Infrastructure Metrics

- **Database Performance**: Query execution times, connection pool utilization
- **Memory Usage**: Process parsing memory consumption
- **CPU Utilization**: Peak processing loads
- **Storage Growth**: Database size trends

### Health Check Implementation

```typescript
@Get('health')
async getHealthStatus(): Promise<HealthStatus> {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await this.checkDatabaseConnection(),
      kafka: await this.checkKafkaConnection(),
      parsing: await this.checkParsingService()
    }
  };
}
```

## Security Considerations

### Data Protection

- **Encryption in Transit**: TLS for all network communication
- **Encryption at Rest**: Database and file system encryption
- **Data Anonymization**: PII scrubbing for research datasets

### Access Control

- **API Authentication**: JWT-based authentication for query endpoints
- **Role-Based Access**: Different permission levels for research teams
- **Audit Logging**: Complete audit trail of data access and modifications

### Privacy Compliance

- **Data Retention**: Automated deletion of expired data
- **Consent Management**: Tracking of data collection permissions
- **Anonymization**: Remove personally identifiable information

## Future Enhancements

### Advanced Analytics

1. **Machine Learning Pipeline**: Automated anomaly detection in process patterns
2. **Predictive Analytics**: Resource usage forecasting
3. **Behavioral Analysis**: Process lifecycle pattern recognition

### Enhanced Query Capabilities

1. **Real-time Dashboards**: Live monitoring of system health and usage
2. **Custom Aggregations**: User-defined analytical functions
3. **Export Capabilities**: Multiple format support (CSV, Parquet, JSON)

### Integration Improvements

1. **Multi-tenant Architecture**: Support for multiple research organizations
2. **Advanced MCP Features**: Enhanced LLM integration capabilities
3. **Third-party Integrations**: Jupyter notebooks, BI tools, data science platforms

## Conclusion

This Process Analytics System design provides a comprehensive solution for ingesting, storing, and querying process data across multiple operating systems. The architecture supports both immediate implementation needs and future scaling requirements, with clear migration paths between development and production environments.

**Key Strengths**:

- **Scalable Foundation**: Architecture ready for enterprise-scale deployment
- **Flexible Querying**: Multiple interfaces for different research use cases
- **Data Integrity**: Raw data preservation and comprehensive validation
- **Performance Optimized**: Bulk processing and strategic indexing
- **Development Friendly**: Docker-based setup with simplified infrastructure

The current implementation demonstrates core capabilities while maintaining compatibility with the full production architecture, ensuring a smooth evolution path as requirements grow.
