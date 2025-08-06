import { Injectable, Logger } from '@nestjs/common';
import { CommandType, OSType, ProcessStatus } from '../entities/enums';
import { ParsedProcess } from '../entities/parsed-process.interface';
import { Process } from '../entities/process.entity';
import { parsePsOutput } from './parsers/ps-parser';
import { parseTasklistOutput } from './parsers/tasklist-parser';

@Injectable()
export class ParsingService {
  private readonly logger = new Logger(ParsingService.name);

  async parseCommandOutput(
    commandType: CommandType,
    osType: OSType,
    output: string,
    commandId: string,
  ): Promise<Process[]> {
    this.logger.debug(`Parsing ${commandType} output for ${osType}`);

    let parsedProcesses: ParsedProcess[] = [];

    const parserMap: Record<CommandType, (output: string) => ParsedProcess[]> =
      {
        [CommandType.PS]: parsePsOutput,
        [CommandType.TASKLIST]: parseTasklistOutput,
      };

    const parser = parserMap[commandType];
    if (!parser) {
      throw new Error(`Unsupported command type: ${commandType}`);
    }
    parsedProcesses = parser(output);

    // Convert to Process entities
    return parsedProcesses.map((parsed) => {
      const process = new Process();
      process.command_id = commandId;
      process.pid = parsed.pid;
      process.process_name = parsed.process_name;
      process.user = parsed.user;
      process.cpu_percent = parsed.cpu_percent;
      process.memory_percent = parsed.memory_percent;
      process.memory_usage = parsed.memory_usage;
      process.virtual_memory_size = parsed.virtual_memory_size;
      process.resident_set_size = parsed.resident_set_size;
      process.tty = parsed.tty;
      process.status = parsed.status || ProcessStatus.UNKNOWN;
      process.start_time = parsed.start_time;
      process.cpu_time = parsed.cpu_time;
      process.session_name = parsed.session_name;
      process.session_id = parsed.session_id;
      process.full_command = parsed.full_command;
      return process;
    });
  }
}
