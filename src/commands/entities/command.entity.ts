import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommandType, OSType } from '../../common/enums';
import { Process } from './process.entity';

@Entity('commands')
@Index(['machine_id', 'timestamp'])
@Index(['os_type', 'command_type'])
export class Command {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp with time zone' })
  @Index()
  timestamp: Date;

  @Column({ length: 255 })
  machine_name: string;

  @Column({ length: 255 })
  @Index()
  machine_id: string;

  @Column({
    type: 'enum',
    enum: OSType,
  })
  os_type: OSType;

  @Column({ length: 100 })
  os_version: string;

  @Column({
    type: 'enum',
    enum: CommandType,
  })
  command_type: CommandType;

  @Column({ type: 'text' })
  raw_output: string;

  @Column({ type: 'int', default: 0 })
  process_count: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  processed_at: Date;

  @OneToMany(() => Process, (process) => process.command, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  processes: Process[];
}
