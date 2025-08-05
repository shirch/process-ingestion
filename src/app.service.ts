import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Process Ingestion Service - Ready to ingest process data! 🚀';
  }
}
