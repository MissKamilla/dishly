import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Recipe } from '../../recipes/entities/recipe.entity';

export const USER_EMAIL_UNIQUE_CONSTRAINT = 'UQ_users_email';

@Entity({ name: 'users' })
@Unique(USER_EMAIL_UNIQUE_CONSTRAINT, ['email'])
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Recipe, (recipe) => recipe.user)
  recipes!: Recipe[];
}
