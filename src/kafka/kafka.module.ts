import { Module } from '@nestjs/common';
import { CommandsModule } from '../commands/commands.module';
import { ProcessCommandsConsumer } from './consumers/process-commands.consumer';

@Module({
  imports: [CommandsModule],
  controllers: [ProcessCommandsConsumer],
})
export class KafkaModule {}
