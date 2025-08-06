import { IngestCommandDto } from '@/commands/dto/ingest-command.dto';
import { CommandsService } from '@/commands/services/commands.service';
import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';

@Controller()
export class ProcessCommandsConsumer {
  private readonly logger = new Logger(ProcessCommandsConsumer.name);

  constructor(private readonly commandsService: CommandsService) {}

  @EventPattern('process-commands')
  async handleProcessCommand(message: IngestCommandDto) {
    try {
      this.logger.log(
        'Received message from Kafka:',
        JSON.stringify(message, null, 2),
      );

      const result = await this.commandsService.ingestCommand(message);

      this.logger.log(`Successfully processed command ${result.id} `);

      return {
        success: true,
        command_id: result.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process message: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }
}
