import { Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn } from 'typeorm';

import { Class } from '../class.entity.js';

const LEGACY_TOPIC_CLOSED_AT_COLUMN = ['expires', 'at'].join('_');

@Entity('gyms')
@ForeignKey(() => Class, ['class_id'], ['id'], {
  name: 'fk_gyms_class_id',
  onDelete: 'NO ACTION',
})
@Index('idx_gyms_class_id', ['class_id'])
@Index('idx_gyms_owner_handle', ['owner_handle'])
@Index('idx_gyms_closed_at', ['closed_at'])
@Index('uq_gyms_owner_handle_gym_id', ['owner_handle', 'gym_id'], {
  unique: true,
  where: 'gym_id IS NOT NULL',
})
export class Gym {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  owner_handle!: string;

  @Column({ type: 'int', nullable: true })
  class_id!: number | null;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  gym_link!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gym_id!: string | null;

  @Column({ name: LEGACY_TOPIC_CLOSED_AT_COLUMN, type: 'datetimeoffset', nullable: true })
  closed_at!: Date | null;

  @Column({ type: 'datetimeoffset', nullable: true })
  last_pulled_at!: Date | null;

  @Column({ type: 'datetimeoffset', default: () => 'SYSDATETIMEOFFSET()' })
  created_at!: Date;
}
