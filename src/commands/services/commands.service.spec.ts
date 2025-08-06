import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IngestCommandDto } from '../dto/ingest-command.dto';
import { Command } from '../entities/command.entity';
import { CommandType, OSType } from '../entities/enums';
import { Process } from '../entities/process.entity';
import { CommandsService } from './commands.service';
import { ParsingService } from './parsing.service';

// Mocks
const mockCommandRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
});
const mockProcessRepository = () => ({
  save: jest.fn(),
});
const mockParsingService = () => ({
  parseCommandOutput: jest.fn(),
});

describe('CommandsService', () => {
  let service: CommandsService;
  let commandRepository: ReturnType<typeof mockCommandRepository>;
  let processRepository: ReturnType<typeof mockProcessRepository>;
  let parsingService: ReturnType<typeof mockParsingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandsService,
        {
          provide: getRepositoryToken(Command),
          useFactory: mockCommandRepository,
        },
        {
          provide: getRepositoryToken(Process),
          useFactory: mockProcessRepository,
        },
        { provide: ParsingService, useFactory: mockParsingService },
      ],
    }).compile();

    service = module.get<CommandsService>(CommandsService);
    commandRepository = module.get(getRepositoryToken(Command));
    processRepository = module.get(getRepositoryToken(Process));
    parsingService = module.get(ParsingService);
  });

  describe('ingestCommand', () => {
    it('should create, save, parse, and bulk insert processes, then return the saved command', async () => {
      const dto: IngestCommandDto = {
        timestamp: new Date().toISOString(),
        machine_name: 'test-machine',
        machine_id: 'machine-123',
        os_type: OSType.UBUNTU,
        os_version: '20.04',
        command: CommandType.PS,
        output:
          'USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\ntest 1234 0.0 0.1 1000 200 pts/0 S 10:00 00:00:01 bash',
      };
      const commandEntity = {
        ...dto,
        id: 'cmd-1',
        command_type: dto.command,
        raw_output: dto.output,
      };
      const savedCommand = { ...commandEntity };
      const parsedProcesses = [
        { id: 'proc-1', command_id: 'cmd-1', pid: 1234, process_name: 'bash' },
      ];

      commandRepository.create.mockReturnValue(commandEntity);
      commandRepository.save.mockResolvedValue(savedCommand);
      parsingService.parseCommandOutput.mockResolvedValue(parsedProcesses);
      processRepository.save.mockResolvedValue(parsedProcesses);

      const result = await service.ingestCommand(dto);

      expect(commandRepository.create).toHaveBeenCalledWith({
        timestamp: expect.any(Date),
        machine_name: dto.machine_name,
        machine_id: dto.machine_id,
        os_type: dto.os_type,
        os_version: dto.os_version,
        command_type: dto.command,
        raw_output: dto.output,
      });
      expect(commandRepository.save).toHaveBeenCalledWith(commandEntity);
      expect(parsingService.parseCommandOutput).toHaveBeenCalledWith(
        dto.command,
        dto.os_type,
        dto.output,
        savedCommand.id,
      );
      expect(processRepository.save).toHaveBeenCalledWith(parsedProcesses);
      expect(result).toEqual(savedCommand);
    });

    it('should handle Windows tasklist command', async () => {
      const dto: IngestCommandDto = {
        timestamp: new Date().toISOString(),
        machine_name: 'test-windows-machine',
        machine_id: 'windows-123',
        os_type: OSType.WINDOWS,
        os_version: '10.0.19044',
        command: CommandType.TASKLIST,
        output: `Image Name                     PID Session Name        Session#    Mem Usage
========================= ======== ================ ========== ============
System Idle Process              0 Services                   0         24 K
System                           4 Services                   0      1,048 K
notepad.exe                   1234 Console                   1      2,048 K`,
      };

      const commandEntity = {
        ...dto,
        id: 'cmd-windows-1',
        command_type: dto.command,
        raw_output: dto.output,
      };
      const savedCommand = { ...commandEntity };
      const parsedProcesses = [
        {
          id: 'proc-1',
          command_id: 'cmd-windows-1',
          pid: 4,
          process_name: 'System',
        },
        {
          id: 'proc-2',
          command_id: 'cmd-windows-1',
          pid: 1234,
          process_name: 'notepad.exe',
        },
      ];

      commandRepository.create.mockReturnValue(commandEntity);
      commandRepository.save.mockResolvedValue(savedCommand);
      parsingService.parseCommandOutput.mockResolvedValue(parsedProcesses);
      processRepository.save.mockResolvedValue(parsedProcesses);

      const result = await service.ingestCommand(dto);

      expect(result).toEqual(savedCommand);
      expect(processRepository.save).toHaveBeenCalledWith(parsedProcesses);
    });

    it('should handle empty process list', async () => {
      const dto: IngestCommandDto = {
        timestamp: new Date().toISOString(),
        machine_name: 'test-machine',
        machine_id: 'machine-123',
        os_type: OSType.UBUNTU,
        os_version: '20.04',
        command: CommandType.PS,
        output: 'USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND',
      };

      const commandEntity = {
        ...dto,
        id: 'cmd-empty-1',
        command_type: dto.command,
        raw_output: dto.output,
      };
      const savedCommand = { ...commandEntity };

      commandRepository.create.mockReturnValue(commandEntity);
      commandRepository.save.mockResolvedValue(savedCommand);
      parsingService.parseCommandOutput.mockResolvedValue([]);
      processRepository.save.mockResolvedValue([]);

      const result = await service.ingestCommand(dto);

      expect(result).toEqual(savedCommand);
      expect(processRepository.save).toHaveBeenCalledWith([]);
    });

    it('should handle parsing errors gracefully', async () => {
      const dto: IngestCommandDto = {
        timestamp: new Date().toISOString(),
        machine_name: 'test-machine',
        machine_id: 'machine-123',
        os_type: OSType.UBUNTU,
        os_version: '20.04',
        command: CommandType.PS,
        output: 'Invalid output format',
      };

      const commandEntity = {
        ...dto,
        id: 'cmd-error-1',
        command_type: dto.command,
        raw_output: dto.output,
      };
      const savedCommand = { ...commandEntity };

      commandRepository.create.mockReturnValue(commandEntity);
      commandRepository.save.mockResolvedValue(savedCommand);
      parsingService.parseCommandOutput.mockRejectedValue(
        new Error('Invalid ps output'),
      );

      await expect(service.ingestCommand(dto)).rejects.toThrow(
        'Invalid ps output',
      );
    });

    it('should handle database errors gracefully', async () => {
      const dto: IngestCommandDto = {
        timestamp: new Date().toISOString(),
        machine_name: 'test-machine',
        machine_id: 'machine-123',
        os_type: OSType.UBUNTU,
        os_version: '20.04',
        command: CommandType.PS,
        output:
          'USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\ntest 1234 0.0 0.1 1000 200 pts/0 S 10:00 00:00:01 bash',
      };

      const commandEntity = {
        ...dto,
        id: 'cmd-db-error-1',
        command_type: dto.command,
        raw_output: dto.output,
      };

      commandRepository.create.mockReturnValue(commandEntity);
      commandRepository.save.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.ingestCommand(dto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle large process lists efficiently', async () => {
      const processes = Array.from(
        { length: 100 },
        (_, i) =>
          `user      ${1000 + i}  0.1  0.1  123456  1234 pts/0   S    10:30   0:00 process${i}`,
      ).join('\n');

      const dto: IngestCommandDto = {
        timestamp: new Date().toISOString(),
        machine_name: 'test-machine',
        machine_id: 'machine-123',
        os_type: OSType.UBUNTU,
        os_version: '20.04',
        command: CommandType.PS,
        output: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n${processes}`,
      };

      const commandEntity = {
        ...dto,
        id: 'cmd-large-1',
        command_type: dto.command,
        raw_output: dto.output,
      };
      const savedCommand = { ...commandEntity };
      const parsedProcesses = Array.from({ length: 100 }, (_, i) => ({
        id: `proc-${i}`,
        command_id: 'cmd-large-1',
        pid: 1000 + i,
        process_name: `process${i}`,
        user: 'user',
        status: 'SLEEPING',
      }));

      commandRepository.create.mockReturnValue(commandEntity);
      commandRepository.save.mockResolvedValue(savedCommand);
      parsingService.parseCommandOutput.mockResolvedValue(parsedProcesses);
      processRepository.save.mockResolvedValue(parsedProcesses);

      const result = await service.ingestCommand(dto);

      expect(result).toEqual(savedCommand);
      expect(processRepository.save).toHaveBeenCalledWith(parsedProcesses);
    });
  });
});
