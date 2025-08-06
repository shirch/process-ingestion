import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IngestCommandDto } from '../dto/ingest-command.dto';
import { CommandType, OSType } from '../entities/enums';
import { CommandsService } from '../services/commands.service';
import { CommandsController } from './commands.controller';

describe('CommandsController', () => {
  let controller: CommandsController;
  let commandsService: { ingestCommand: jest.Mock };

  beforeEach(async () => {
    commandsService = { ingestCommand: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommandsController],
      providers: [{ provide: CommandsService, useValue: commandsService }],
    }).compile();

    controller = module.get<CommandsController>(CommandsController);
  });

  describe('ingestCommand', () => {
    const validDto: IngestCommandDto = {
      timestamp: new Date().toISOString(),
      machine_name: 'test-machine',
      machine_id: 'machine-123',
      os_type: OSType.UBUNTU,
      os_version: '20.04',
      command: CommandType.PS,
      output:
        'USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\ntest 1234 0.0 0.1 1000 200 pts/0 S 10:00 00:00:01 bash',
    };

    it('should successfully process a command and return success response', async () => {
      const mockResult = {
        id: 'cmd-123',
        processed_at: new Date(),
      };
      commandsService.ingestCommand.mockResolvedValue(mockResult);

      const result = await controller.ingestCommand(validDto);

      expect(commandsService.ingestCommand).toHaveBeenCalledWith(validDto);
      expect(result).toEqual({
        success: true,
        message: 'Command processed successfully',
        data: {
          command_id: 'cmd-123',
          processed_at: mockResult.processed_at,
        },
      });
    });

    it('should handle service errors and throw HttpException', async () => {
      const error = new Error('Database connection failed');
      commandsService.ingestCommand.mockRejectedValue(error);

      await expect(controller.ingestCommand(validDto)).rejects.toThrow(
        HttpException,
      );

      await expect(controller.ingestCommand(validDto)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: {
          success: false,
          error: 'Database connection failed',
        },
      });
    });

    it('should handle validation errors from service', async () => {
      const validationError = new Error('Invalid command output format');
      commandsService.ingestCommand.mockRejectedValue(validationError);

      await expect(controller.ingestCommand(validDto)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: {
          success: false,
          error: 'Invalid command output format',
        },
      });
    });

    it('should handle Windows tasklist command', async () => {
      const windowsDto: IngestCommandDto = {
        ...validDto,
        os_type: OSType.WINDOWS,
        command: CommandType.TASKLIST,
        output:
          'Image Name                     PID Session Name        Session#    Mem Usage\n========================= ======== ================ ========== ============\nnotepad.exe                   1234 Console                   1      2,048 K',
      };

      const mockResult = {
        id: 'cmd-windows-123',
        processed_at: new Date(),
      };
      commandsService.ingestCommand.mockResolvedValue(mockResult);

      const result = await controller.ingestCommand(windowsDto);

      expect(commandsService.ingestCommand).toHaveBeenCalledWith(windowsDto);
      expect(result.success).toBe(true);
    });

    it('should handle macOS ps command', async () => {
      const macosDto: IngestCommandDto = {
        ...validDto,
        os_type: OSType.MACOS,
        command: CommandType.PS,
      };

      const mockResult = {
        id: 'cmd-macos-123',
        processed_at: new Date(),
      };
      commandsService.ingestCommand.mockResolvedValue(mockResult);

      const result = await controller.ingestCommand(macosDto);

      expect(commandsService.ingestCommand).toHaveBeenCalledWith(macosDto);
      expect(result.success).toBe(true);
    });
  });
});
