import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IngestCommandDto } from '../../commands/dto/ingest-command.dto';
import { CommandType, OSType } from '../../commands/entities/enums';
import { CommandsService } from '../../commands/services/commands.service';
import { ProcessCommandsConsumer } from './process-commands.consumer';

describe('ProcessCommandsConsumer', () => {
  let consumer: ProcessCommandsConsumer;
  let commandsService: { ingestCommand: jest.Mock };
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    commandsService = { ingestCommand: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessCommandsConsumer,
        { provide: CommandsService, useValue: commandsService },
      ],
    }).compile();

    consumer = module.get<ProcessCommandsConsumer>(ProcessCommandsConsumer);
    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('should process command successfully', async () => {
    const mockResult = { id: 'cmd-1' };
    commandsService.ingestCommand.mockResolvedValue(mockResult);

    const result = await consumer.handleProcessCommand(dto);

    expect(commandsService.ingestCommand).toHaveBeenCalledWith(dto);
    expect(loggerLogSpy).toHaveBeenCalled();
    expect(result).toEqual({ success: true, command_id: 'cmd-1' });
  });

  it('should handle errors and return failure', async () => {
    const error = new Error('Something went wrong');
    commandsService.ingestCommand.mockRejectedValue(error);

    const result = await consumer.handleProcessCommand(dto);

    expect(commandsService.ingestCommand).toHaveBeenCalledWith(dto);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to process message: ${error.message}`,
      error.stack,
    );
    expect(result).toEqual({ success: false, error: error.message });
  });
});
