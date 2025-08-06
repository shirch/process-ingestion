import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create HTTP application
  const app = await NestFactory.create(AppModule);

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS for development
  app.enableCors({
    origin: process.env.NODE_ENV === 'development' ? true : false,
  });

  // Connect Kafka microservice
  const kafkaBroker = 'kafka:9092'; // Use internal Kafka port
  console.log(`🔗 Connecting to Kafka broker: ${kafkaBroker}`);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'process-ingestion-service',
        brokers: [kafkaBroker],
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      },
      consumer: {
        groupId: 'process-ingestion-group',
      },
    },
  });

  // Start HTTP server first
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 HTTP server is running on port ${port}`);

  // Then start Kafka microservice
  try {
    await app.startAllMicroservices();
    console.log(`📨 Kafka microservice connected to: ${kafkaBroker}`);
  } catch (error) {
    console.error('❌ Failed to connect Kafka microservice:', error.message);
    console.log('🔄 HTTP service will continue running without Kafka');
  }

  console.log(
    `📊 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`,
  );
}

bootstrap();
