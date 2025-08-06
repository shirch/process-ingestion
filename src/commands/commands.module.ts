import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandsController } from './controllers/commands.controller';
import { Command } from './entities/command.entity';
import { Process } from './entities/process.entity';
import { CommandsService } from './services/commands.service';
import { ParsingService } from './services/parsing.service';

@Module({
  imports: [TypeOrmModule.forFeature([Command, Process])],
  controllers: [CommandsController], // For handling HTTP requests
  providers: [CommandsService, ParsingService],
  exports: [CommandsService], // Export for use by Kafka consumer
})
export class CommandsModule {}
