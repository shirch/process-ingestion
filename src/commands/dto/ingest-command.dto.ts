import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CommandType, OSType } from '../entities/enums';

export class IngestCommandDto {
  @IsDateString()
  @IsNotEmpty()
  timestamp: string;

  @IsString()
  @IsNotEmpty()
  machine_name: string;

  @IsString()
  @IsNotEmpty()
  machine_id: string;

  @IsEnum(OSType)
  @IsNotEmpty()
  os_type: OSType;

  @IsString()
  @IsNotEmpty()
  os_version: string;

  @IsEnum(CommandType)
  @IsNotEmpty()
  command: CommandType;

  @IsString()
  @IsNotEmpty()
  output: string;
}
