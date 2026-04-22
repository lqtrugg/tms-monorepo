import { Check, Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn } from 'typeorm';

import { Class } from './class.entity.js';
import { Teacher } from './teacher.entity.js';

@Entity('class_schedules')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_class_schedules_teacher_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Class, ['class_id'], ['id'], {
  name: 'fk_class_schedules_class_id',
  onDelete: 'RESTRICT',
})
@Index('idx_class_schedules_teacher_id', ['teacher_id'])
@Index('idx_class_schedules_class_id', ['class_id'])
@Check('chk_class_schedules_day_of_week', 'day_of_week BETWEEN 0 AND 6')
@Check('chk_class_schedules_effective', 'effective_until IS NULL OR effective_until > effective_from')
export class ClassSchedule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'integer' })
  class_id!: number;

  @Column({ type: 'smallint' })
  day_of_week!: number;

  @Column({ type: 'time' })
  start_time!: string;

  @Column({ type: 'date' })
  effective_from!: string;

  @Column({ type: 'date', nullable: true })
  effective_until!: string | null;
}
