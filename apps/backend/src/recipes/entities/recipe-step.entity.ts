import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity({ name: 'recipe_steps' })
@Unique('UQ_recipe_steps_recipe_id_position', ['recipeId', 'position'])
export class RecipeStep {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  text!: string;

  @Column({ name: 'group_name', type: 'varchar', length: 255, nullable: true })
  group!: string | null;

  @Column({ name: 'duration_minutes', type: 'integer', nullable: true })
  durationMinutes!: number | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'integer' })
  position!: number;

  @Column({ name: 'recipe_id', type: 'integer' })
  recipeId!: number;

  @ManyToOne(() => Recipe, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe!: Recipe;
}
