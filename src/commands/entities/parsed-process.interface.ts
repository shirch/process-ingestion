import { ProcessStatus } from './enums';

export interface ParsedProcess {
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
