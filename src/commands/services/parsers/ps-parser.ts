import { ProcessStatus } from '../../entities/enums';
import { ParsedProcess } from '../../entities/parsed-process.interface';

export function parsePsOutput(output: string): ParsedProcess[] {
  const lines = output.trim().split('\n');
  if (lines.length < 1) {
    throw new Error('Invalid ps output: missing header or data');
  }

  // Skip header line
  const dataLines = lines.slice(1);
  const processes: ParsedProcess[] = [];

  for (const line of dataLines) {
    try {
      const parsed = parsePsLine(line.trim());
      if (parsed) {
        processes.push(parsed);
      }
    } catch (error) {
      console.warn(`Failed to parse ps line: "${line}" - ${error.message}`);
      // Continue processing other lines
    }
  }

  return processes;
}

function parsePsLine(line: string): ParsedProcess | null {
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
  const processName = extractProcessName(fullCommand);

  return {
    pid,
    process_name: processName,
    user,
    cpu_percent: parseFloat(cpuStr) || undefined,
    memory_percent: parseFloat(memStr) || undefined,
    virtual_memory_size: parseInt(vszStr, 10) || undefined,
    resident_set_size: parseInt(rssStr, 10) || undefined,
    tty: tty === '?' ? null : tty,
    status: mapPsStatus(stat),
    start_time: start,
    cpu_time: time,
    full_command: fullCommand,
  };
}

function extractProcessName(fullCommand: string): string {
  if (!fullCommand) return 'unknown';

  // Extract just the executable name from full command
  const parts = fullCommand.split(/\s+/);
  const executable = parts[0];

  // Get basename (remove path)
  const basename =
    executable.split('/').pop() || executable.split('\\').pop() || executable;

  return basename;
}

function mapPsStatus(stat: string): ProcessStatus {
  if (!stat) return ProcessStatus.UNKNOWN;

  const firstChar = stat.charAt(0).toUpperCase();

  const statusMap: Record<string, ProcessStatus> = {
    R: ProcessStatus.RUNNING,
    S: ProcessStatus.SLEEPING,
    T: ProcessStatus.STOPPED,
    Z: ProcessStatus.ZOMBIE,
    I: ProcessStatus.IDLE,
  };

  return statusMap[firstChar] || ProcessStatus.UNKNOWN;
}
