import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestCommandDto } from '../dto/ingest-command.dto';
import { Command } from '../entities/command.entity';
import { Process } from '../entities/process.entity';
import { ParsingService } from './parsing.service';

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

  constructor(
    @InjectRepository(Command)
    private commandRepository: Repository<Command>,
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    private parsingService: ParsingService,
  ) {}

  async ingestCommand(ingestCommandDto: IngestCommandDto): Promise<Command> {
    // Create command entity
    const command = this.commandRepository.create({
      timestamp: new Date(ingestCommandDto.timestamp),
      machine_name: ingestCommandDto.machine_name,
      machine_id: ingestCommandDto.machine_id,
      os_type: ingestCommandDto.os_type,
      os_version: ingestCommandDto.os_version,
      command_type: ingestCommandDto.command,
      raw_output: ingestCommandDto.output,
    });

    // Save command first to get ID
    const savedCommand = await this.commandRepository.save(command);

    // Parse processes from command output
    const processes = await this.parsingService.parseCommandOutput(
      ingestCommandDto.command,
      ingestCommandDto.os_type,
      ingestCommandDto.output,
      savedCommand.id,
    );

    // Bulk insert processes
    // For bigger datasets, consider splitting into chunks
    await this.processRepository.save(processes);

    this.logger.log(
      `Successfully processed ${processes.length} processes for command ${savedCommand.id}`,
    );

    return savedCommand;
  }
}
