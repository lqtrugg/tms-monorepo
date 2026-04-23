import { Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Student } from './student.entity.js';
import { Teacher } from './teacher.entity.js';
import { TopicProblem } from './topic-problem.entity.js';
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
@ForeignKey(() => TopicProblem, ['problem_id'], ['id'], {
  name: 'fk_topic_standings_problem_id',
  onDelete: 'CASCADE',
})
@Unique('uq_topic_standings_student_problem', ['topic_id', 'student_id', 'problem_id'])
@Index('idx_topic_standings_teacher_id', ['teacher_id'])
@Index('idx_topic_standings_topic_id', ['topic_id'])
@Index('idx_topic_standings_student_id', ['student_id'])
export class TopicStanding {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'integer' })
  topic_id!: number;

  @Column({ type: 'integer' })
  student_id!: number;

  @Column({ type: 'integer' })
  problem_id!: number;

  @Column({ type: 'boolean', default: false })
  solved!: boolean;

  @Column({ type: 'integer', nullable: true })
  penalty_minutes!: number | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  pulled_at!: Date;
}
