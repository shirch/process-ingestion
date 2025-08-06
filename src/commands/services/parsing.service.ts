import { Injectable, Logger } from '@nestjs/common';
import { CommandType, OSType, ProcessStatus } from '../entities/enums';
import { Process } from '../entities/process.entity';

interface ParsedProcess {
  pid: number;
  process_name: string;
  user?: string;
  cpu_percent?: number;
  memory_percent?: number;
  memory_usage?: string;
  virtual_memory_size?: number;
  resident_set_size?: number;
  tty?: string;
  status?: ProcessStatus;
  start_time?: string;
  cpu_time?: string;
  session_name?: string;
  session_id?: number;
  full_command?: string;
}

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
        [CommandType.PS]: (output) => this.parsePsOutput(output),
        [CommandType.TASKLIST]: (output) => this.parseTasklistOutput(output),
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

  private parsePsOutput(output: string): ParsedProcess[] {
    const lines = output.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid ps output: missing header or data');
    }

    // Skip header line
    const dataLines = lines.slice(1);
    const processes: ParsedProcess[] = [];

    for (const line of dataLines) {
      try {
        const parsed = this.parsePsLine(line.trim());
        if (parsed) {
          processes.push(parsed);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse ps line: "${line}" - ${error.message}`,
        );
        // Continue processing other lines
      }
    }

    return processes;
  }

  private parsePsLine(line: string): ParsedProcess | null {
    if (!line || line.startsWith('[') || line.length < 10) {
      return null; // Skip kernel threads and invalid lines
    }

    // Split by whitespace, but handle command with spaces
    const parts = line.split(/\s+/);

    if (parts.length < 11) {
      return null; // Invalid format
    }

    // ps auxww format: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
    const [
      user,
      pidStr,
      cpuStr,
      memStr,
      vszStr,
      rssStr,
      tty,
      stat,
      start,
      time,
      ...commandParts
    ] = parts;

    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) {
      return null;
    }

    const fullCommand = commandParts.join(' ');
    const processName = this.extractProcessName(fullCommand);

    return {
      pid,
      process_name: processName,
      user,
      cpu_percent: parseFloat(cpuStr) || undefined,
      memory_percent: parseFloat(memStr) || undefined,
      virtual_memory_size: parseInt(vszStr, 10) || undefined,
      resident_set_size: parseInt(rssStr, 10) || undefined,
      tty: tty === '?' ? null : tty,
      status: this.mapPsStatus(stat),
      start_time: start,
      cpu_time: time,
      full_command: fullCommand,
    };
  }

  private parseTasklistOutput(output: string): ParsedProcess[] {
    const lines = output.trim().split('\n');
    if (lines.length < 3) {
      throw new Error('Invalid tasklist output: missing header or data');
    }

    // Skip header lines (first 2-3 lines are headers/separators)
    const dataLines = lines
      .slice(2)
      .filter(
        (line) =>
          line.trim() && !line.includes('====') && line.trim().length > 10,
      );

    const processes: ParsedProcess[] = [];

    for (const line of dataLines) {
      try {
        const parsed = this.parseTasklistLine(line.trim());
        if (parsed) {
          processes.push(parsed);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse tasklist line: "${line}" - ${error.message}`,
        );
        // Continue processing other lines
      }
    }

    return processes;
  }

  private parseTasklistLine(line: string): ParsedProcess | null {
    if (!line || line.length < 10) {
      return null;
    }

    // tasklist format: ImageName PID SessionName Session# MemUsage
    // Split carefully to handle spaces in process names
    const parts = line.split(/\s+/);

    if (parts.length < 5) {
      return null;
    }

    const processName = parts[0];
    const pidStr = parts[1];
    const sessionName = parts[2];
    const sessionIdStr = parts[3];
    const memUsage = parts[4];

    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) {
      return null;
    }

    const sessionId = parseInt(sessionIdStr, 10);

    return {
      pid,
      process_name: processName,
      session_name: sessionName,
      session_id: isNaN(sessionId) ? undefined : sessionId,
      memory_usage: memUsage,
      status: ProcessStatus.RUNNING, // Windows tasklist shows only running processes
    };
  }

  private extractProcessName(fullCommand: string): string {
    if (!fullCommand) return 'unknown';

    // Extract just the executable name from full command
    const parts = fullCommand.split(/\s+/);
    const executable = parts[0];

    // Get basename (remove path)
    const basename =
      executable.split('/').pop() || executable.split('\\').pop() || executable;

    return basename;
  }

  private mapPsStatus(stat: string): ProcessStatus {
    if (!stat) return ProcessStatus.UNKNOWN;

    const firstChar = stat.charAt(0).toUpperCase();

    switch (firstChar) {
      case 'R':
        return ProcessStatus.RUNNING;
      case 'S':
        return ProcessStatus.SLEEPING;
      case 'T':
        return ProcessStatus.STOPPED;
      case 'Z':
        return ProcessStatus.ZOMBIE;
      case 'I':
        return ProcessStatus.IDLE;
      default:
        return ProcessStatus.UNKNOWN;
    }
  }
}
