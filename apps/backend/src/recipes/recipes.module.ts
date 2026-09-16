import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipeStep } from './entities/recipe-step.entity';
import { Recipe } from './entities/recipe.entity';
import { RECIPE_IMPORT_QUEUE } from './queue/recipe-import.contract';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep]),
    BullModule.registerQueue({
      name: RECIPE_IMPORT_QUEUE,
    }),
  ],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
