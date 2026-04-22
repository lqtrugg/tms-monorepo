import { Check, Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Student } from './student.entity.js';
import { Teacher } from './teacher.entity.js';
import { Topic } from './topic.entity.js';

@Entity('topic_standings')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_topic_standings_teacher_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Topic, ['topic_id'], ['id'], {
  name: 'fk_topic_standings_topic_id',
  onDelete: 'CASCADE',
})
@ForeignKey(() => Student, ['student_id'], ['id'], {
  name: 'fk_topic_standings_student_id',
  onDelete: 'RESTRICT',
})
@Unique('uq_topic_standings_topic_student', ['topic_id', 'student_id'])
@Index('idx_topic_standings_teacher_id', ['teacher_id'])
@Index('idx_topic_standings_topic_id', ['topic_id'])
@Index('idx_topic_standings_student_id', ['student_id'])
@Check('chk_topic_standings_problems_solved', 'problems_solved >= 0')
export class TopicStanding {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'integer' })
  topic_id!: number;

  @Column({ type: 'integer' })
  student_id!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  codeforces_handle!: string | null;

  @Column({ type: 'integer', default: 0 })
  problems_solved!: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  pulled_at!: Date;
}
