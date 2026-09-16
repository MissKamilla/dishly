import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipeStep } from './entities/recipe-step.entity';
import { Recipe } from './entities/recipe.entity';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep])],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
