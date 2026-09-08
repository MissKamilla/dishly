import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity({ name: 'recipe_ingredients' })
@Unique('UQ_recipe_ingredients_recipe_id_position', ['recipeId', 'position'])
export class RecipeIngredient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'raw_text', type: 'text' })
  rawText!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'double precision', nullable: true })
  quantity!: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  unit!: string | null;

  @Column({ type: 'integer' })
  position!: number;

  @Column({ name: 'recipe_id', type: 'integer' })
  recipeId!: number;

  @ManyToOne(() => Recipe, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe!: Recipe;
}
