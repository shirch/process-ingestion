import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProcessStatus } from '../../common/enums';
import { Command } from './command.entity';

@Entity('processes')
@Index(['command_id', 'pid'])
@Index(['process_name'])
@Index(['user'])
export class Process {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  command_id: string;

  @Column({ type: 'int' })
  pid: number;

  @Column({ length: 500 })
  process_name: string;

  @Column({ length: 100, nullable: true })
  user: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  cpu_percent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  memory_percent: number;

  @Column({ length: 50, nullable: true })
  memory_usage: string;

  @Column({ type: 'bigint', nullable: true })
  virtual_memory_size: number;

  @Column({ type: 'bigint', nullable: true })
  resident_set_size: number;

  @Column({ length: 20, nullable: true })
  tty: string;

  @Column({
    type: 'enum',
    enum: ProcessStatus,
    default: ProcessStatus.UNKNOWN,
  })
  status: ProcessStatus;

  @Column({ type: 'time', nullable: true })
  start_time: string;

  @Column({ type: 'time', nullable: true })
  cpu_time: string;

  @Column({ length: 50, nullable: true })
  session_name: string;

  @Column({ type: 'int', nullable: true })
  session_id: number;

  @Column({ type: 'text', nullable: true })
  full_command: string;

  @ManyToOne(() => Command, (command) => command.processes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'command_id' })
  command: Command;
}
