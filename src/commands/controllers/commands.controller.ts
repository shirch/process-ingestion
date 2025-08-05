import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { IngestCommandDto } from '../dto/ingest-command.dto';
import { CommandsService } from '../services/commands.service';

@Controller('commands')
export class CommandsController {
  private readonly logger = new Logger(CommandsController.name);

  constructor(private readonly commandsService: CommandsService) {}

  @Post()
  async ingestCommand(@Body() ingestCommandDto: IngestCommandDto) {
    try {
      this.logger.log(
        `Ingesting command: ${ingestCommandDto.command} from ${ingestCommandDto.machine_name} (${ingestCommandDto.os_type})`,
      );

      const result = await this.commandsService.ingestCommand(ingestCommandDto);

      this.logger.log(
        `Successfully processed command ${result.id} with ${result.process_count} processes`,
      );

      return {
        success: true,
        message: 'Command processed successfully',
        data: {
          command_id: result.id,
          process_count: result.process_count,
          processed_at: result.processed_at,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to ingest command: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          error: error.message,
          details:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
