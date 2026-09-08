import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';

@Entity({ name: 'recipes' })
@Index('IDX_recipes_user_id', ['userId'])
export class Recipe {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'source_url', type: 'text' })
  sourceUrl!: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'integer', nullable: true })
  servings!: number | null;

  @Column({ name: 'prep_time_minutes', type: 'integer', nullable: true })
  prepTimeMinutes!: number | null;

  @Column({ name: 'cook_time_minutes', type: 'integer', nullable: true })
  cookTimeMinutes!: number | null;

  @Column({
    type: 'enum',
    enum: RecipeStatus,
    enumName: 'recipe_status',
    default: RecipeStatus.PENDING,
  })
  status!: RecipeStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => RecipeIngredient, (ingredient) => ingredient.recipe)
  ingredients!: RecipeIngredient[];

  @OneToMany(() => RecipeStep, (step) => step.recipe)
  steps!: RecipeStep[];
}
