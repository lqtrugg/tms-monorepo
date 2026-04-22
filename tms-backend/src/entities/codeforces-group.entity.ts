import { Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Class } from './class.entity.js';
import { Teacher } from './teacher.entity.js';

@Entity('codeforces_groups')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_codeforces_groups_teacher_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Class, ['class_id'], ['id'], {
  name: 'fk_codeforces_groups_class_id',
  onDelete: 'RESTRICT',
})
@Unique('uq_codeforces_groups_class_id', ['class_id'])
@Index('idx_codeforces_groups_teacher_id', ['teacher_id'])
export class CodeforcesGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'integer' })
  class_id!: number;

  @Column({ type: 'text' })
  group_url!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  group_name!: string | null;
}
