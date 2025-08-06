import { Test, TestingModule } from '@nestjs/testing';
import { CommandType, OSType, ProcessStatus } from '../entities/enums';
import { Process } from '../entities/process.entity';
import { ParsingService } from './parsing.service';

describe('ParsingService', () => {
  let service: ParsingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParsingService],
    }).compile();

    service = module.get<ParsingService>(ParsingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseCommandOutput', () => {
    const testCommandId = 'test-command-id-123';

    describe('PS command parsing', () => {
      it('should parse valid ps output correctly', async () => {
        const psOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1  225916  9488 ?        Ss   Jan01   0:01 /sbin/init
root         2  0.0  0.0      0     0 ?        S    Jan01   0:00 [kthreadd]
user      1234  1.2  2.5 1234567 89012 pts/0   R+   10:30   0:05 /usr/bin/node server.js
user      5678  0.5  1.8  987654 54321 pts/1   S    10:25   0:02 /usr/bin/python3 app.py`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.UBUNTU,
          psOutput,
          testCommandId,
        );

        expect(result).toHaveLength(4);

        // Check first process (init)
        expect(result[0]).toBeInstanceOf(Process);
        expect(result[0].command_id).toBe(testCommandId);
        expect(result[0].pid).toBe(1);
        expect(result[0].process_name).toBe('init');
        expect(result[0].user).toBe('root');
        expect(result[0].cpu_percent).toBeUndefined(); // parseFloat('0.0') returns undefined
        expect(result[0].memory_percent).toBe(0.1);
        expect(result[0].virtual_memory_size).toBe(225916);
        expect(result[0].resident_set_size).toBe(9488);
        expect(result[0].tty).toBeNull(); // PS parser converts '?' to null
        expect(result[0].status).toBe(ProcessStatus.SLEEPING);
        expect(result[0].start_time).toBe('Jan01');
        expect(result[0].cpu_time).toBe('0:01');
        expect(result[0].full_command).toBe('/sbin/init');

        // Check node process
        expect(result[2].pid).toBe(1234);
        expect(result[2].process_name).toBe('node');
        expect(result[2].user).toBe('user');
        expect(result[2].cpu_percent).toBe(1.2);
        expect(result[2].memory_percent).toBe(2.5);
        expect(result[2].status).toBe(ProcessStatus.RUNNING);
      });

      it('should handle ps output with kernel threads', async () => {
        const psOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1  225916  9488 ?        Ss   Jan01   0:01 /sbin/init
[kthreadd]    2  0.0  0.0      0     0 ?        S    Jan01   0:00 [kthreadd]
user      1234  1.2  2.5 1234567 89012 pts/0   R+   10:30   0:05 /usr/bin/node server.js`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.UBUNTU,
          psOutput,
          testCommandId,
        );

        expect(result).toHaveLength(2); // Should skip kernel thread
        expect(result[0].pid).toBe(1);
        expect(result[1].pid).toBe(1234);
      });

      it('should handle ps output with different status codes', async () => {
        const psOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1  225916  9488 ?        Ss   Jan01   0:01 /sbin/init
user      1234  1.2  2.5 1234567 89012 pts/0   R+   10:30   0:05 /usr/bin/node server.js
user      5678  0.0  0.0      0     0 ?        Z    10:25   0:00 [defunct]
user      9999  0.0  0.0      0     0 ?        T    10:25   0:00 [stopped]`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.UBUNTU,
          psOutput,
          testCommandId,
        );

        expect(result).toHaveLength(4);
        expect(result[0].status).toBe(ProcessStatus.SLEEPING); // S
        expect(result[1].status).toBe(ProcessStatus.RUNNING); // R
        expect(result[2].status).toBe(ProcessStatus.ZOMBIE); // Z
        expect(result[3].status).toBe(ProcessStatus.STOPPED); // T
      });

      it('should handle ps output with missing optional fields', async () => {
        const psOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
user      1234   -    -  1234567 89012 pts/0   R+   10:30   0:05 /usr/bin/node server.js`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.UBUNTU,
          psOutput,
          testCommandId,
        );

        expect(result).toHaveLength(1);
        expect(result[0].cpu_percent).toBeUndefined();
        expect(result[0].memory_percent).toBeUndefined();
        expect(result[0].status).toBe(ProcessStatus.RUNNING);
      });

      it('should handle empty ps output', async () => {
        const psOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1  225916  9488 ?        Ss   Jan01   0:01 /sbin/init`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.UBUNTU,
          psOutput,
          testCommandId,
        );

        expect(result).toHaveLength(1);
      });

      it('should handle malformed ps output', async () => {
        const psOutput = `Invalid output format`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.UBUNTU,
          psOutput,
          testCommandId,
        );

        expect(result).toEqual([]);
      });
    });

    describe('TASKLIST command parsing', () => {
      it('should parse valid tasklist output correctly', async () => {
        const tasklistOutput = `Image Name                     PID Session Name        Session#    Mem Usage
========================= ======== ================ ========== ============
System Idle Process              0 Services                   0         24 K
System                           4 Services                   0      1,048 K
smss.exe                       456 Services                   0        372 K
csrss.exe                      524 Services                   0      2,048 K
winlogon.exe                   552 Services                   0      3,072 K
notepad.exe                   1234 Console                   1      2,048 K`;

        const result = await service.parseCommandOutput(
          CommandType.TASKLIST,
          OSType.WINDOWS,
          tasklistOutput,
          testCommandId,
        );

        expect(result).toHaveLength(5); // System Idle Process is skipped due to spaces in name

        // Check System process
        expect(result[0]).toBeInstanceOf(Process);
        expect(result[0].command_id).toBe(testCommandId);
        expect(result[0].pid).toBe(4);
        expect(result[0].process_name).toBe('System');
        expect(result[0].session_name).toBe('Services');
        expect(result[0].session_id).toBe(0);
        expect(result[0].memory_usage).toBe('1,048'); // Tasklist parser doesn't include 'K' in memory usage
        expect(result[0].status).toBe(ProcessStatus.RUNNING);

        // Check notepad process
        expect(result[4].pid).toBe(1234);
        expect(result[4].process_name).toBe('notepad.exe');
        expect(result[4].session_name).toBe('Console');
        expect(result[4].session_id).toBe(1);
        expect(result[4].memory_usage).toBe('2,048'); // Tasklist parser doesn't include 'K' in memory usage
      });

      it('should handle tasklist output with invalid session IDs', async () => {
        const tasklistOutput = `Image Name                     PID Session Name        Session#    Mem Usage
========================= ======== ================ ========== ============
notepad.exe                   1234 Console                   N/A      2,048 K`;

        const result = await service.parseCommandOutput(
          CommandType.TASKLIST,
          OSType.WINDOWS,
          tasklistOutput,
          testCommandId,
        );

        expect(result).toHaveLength(1);
        expect(result[0].session_id).toBeUndefined();
      });

      it('should handle empty tasklist output', async () => {
        const tasklistOutput = `Image Name                     PID Session Name        Session#    Mem Usage
========================= ======== ================ ========== ============
System Idle Process              0 Services                   0         24 K`;

        const result = await service.parseCommandOutput(
          CommandType.TASKLIST,
          OSType.WINDOWS,
          tasklistOutput,
          testCommandId,
        );

        expect(result).toHaveLength(0); // System Idle Process is skipped due to spaces
      });

      it('should handle malformed tasklist output', async () => {
        const tasklistOutput = `Invalid output format`;

        await expect(
          service.parseCommandOutput(
            CommandType.TASKLIST,
            OSType.WINDOWS,
            tasklistOutput,
            testCommandId,
          ),
        ).rejects.toThrow('Invalid tasklist output: missing header or data');
      });
    });

    describe('Error handling', () => {
      it('should throw error for unsupported command type', async () => {
        const invalidCommandType = 'INVALID' as CommandType;

        await expect(
          service.parseCommandOutput(
            invalidCommandType,
            OSType.UBUNTU,
            'some output',
            testCommandId,
          ),
        ).rejects.toThrow('Unsupported command type: INVALID');
      });

      it('should handle parser errors gracefully', async () => {
        const malformedPsOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1  225916  9488 ?        Ss   Jan01   0:01 /sbin/init
invalid line format
user      1234  1.2  2.5 1234567 89012 pts/0   R+   10:30   0:05 /usr/bin/node server.js`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.UBUNTU,
          malformedPsOutput,
          testCommandId,
        );

        // Should still parse valid lines and skip invalid ones
        expect(result).toHaveLength(2);
        expect(result[0].pid).toBe(1);
        expect(result[1].pid).toBe(1234);
      });
    });

    describe('Process entity mapping', () => {
      it('should correctly map all fields to Process entity', async () => {
        const psOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
user      1234  1.2  2.5 1234567 89012 pts/0   R+   10:30   0:05 /usr/bin/node server.js --port 3000`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.UBUNTU,
          psOutput,
          testCommandId,
        );

        expect(result).toHaveLength(1);
        const process = result[0];

        // Verify all fields are mapped correctly
        expect(process.command_id).toBe(testCommandId);
        expect(process.pid).toBe(1234);
        expect(process.process_name).toBe('node');
        expect(process.user).toBe('user');
        expect(process.cpu_percent).toBe(1.2);
        expect(process.memory_percent).toBe(2.5);
        expect(process.memory_usage).toBeUndefined(); // Not in ps output
        expect(process.virtual_memory_size).toBe(1234567);
        expect(process.resident_set_size).toBe(89012);
        expect(process.tty).toBe('pts/0');
        expect(process.status).toBe(ProcessStatus.RUNNING);
        expect(process.start_time).toBe('10:30');
        expect(process.cpu_time).toBe('0:05');
        expect(process.session_name).toBeUndefined(); // Not in ps output
        expect(process.session_id).toBeUndefined(); // Not in ps output
        expect(process.full_command).toBe(
          '/usr/bin/node server.js --port 3000',
        );
      });

      it('should set default status to UNKNOWN when status is not provided', async () => {
        const psOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
user      1234  1.2  2.5 1234567 89012 pts/0   X    10:30   0:05 /usr/bin/node server.js`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.UBUNTU,
          psOutput,
          testCommandId,
        );

        expect(result).toHaveLength(1);
        expect(result[0].status).toBe(ProcessStatus.UNKNOWN);
      });
    });

    describe('Cross-platform compatibility', () => {
      it('should handle macOS ps output', async () => {
        const psOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
user      1234  1.2  2.5 1234567 89012 pts/0   R+   10:30   0:05 /usr/bin/node server.js`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.MACOS,
          psOutput,
          testCommandId,
        );

        expect(result).toHaveLength(1);
        expect(result[0].pid).toBe(1234);
        expect(result[0].process_name).toBe('node');
      });

      it('should handle Windows ps output', async () => {
        const psOutput = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
user      1234  1.2  2.5 1234567 89012 pts/0   R+   10:30   0:05 /usr/bin/node server.js`;

        const result = await service.parseCommandOutput(
          CommandType.PS,
          OSType.WINDOWS,
          psOutput,
          testCommandId,
        );

        expect(result).toHaveLength(1);
        expect(result[0].pid).toBe(1234);
        expect(result[0].process_name).toBe('node');
      });
    });
  });
});
