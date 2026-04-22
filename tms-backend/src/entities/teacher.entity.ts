import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('teachers')
@Unique('uq_teachers_username', ['username'])
export class Teacher {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  username!: string;

  @Column({ type: 'text' })
  password_hash!: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
}
