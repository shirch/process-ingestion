import { ProcessStatus } from '../../entities/enums';
import { ParsedProcess } from '../../entities/parsed-process.interface';

export function parseTasklistOutput(output: string): ParsedProcess[] {
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
      const parsed = parseTasklistLine(line.trim());
      if (parsed) {
        processes.push(parsed);
      }
    } catch (error) {
      console.warn(
        `Failed to parse tasklist line: "${line}" - ${error.message}`,
      );
      // Continue processing other lines
    }
  }

  return processes;
}

function parseTasklistLine(line: string): ParsedProcess | null {
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
