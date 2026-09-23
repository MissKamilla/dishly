import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipeStep } from './entities/recipe-step.entity';
import { Recipe } from './entities/recipe.entity';
import { RecipeParserService } from './parser/recipe-parser.service';
import { RECIPE_IMPORT_QUEUE } from './queue/recipe-import.contract';
import { RecipeImportProcessor } from './queue/recipe-import.processor';
import { RecipeImportQueue } from './queue/recipe-import.queue';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep]),
    BullModule.registerQueue({
      name: RECIPE_IMPORT_QUEUE,
      skipWaitingForReady: true,
    }),
  ],
  controllers: [RecipesController],
  providers: [
    RecipesService,
    RecipeImportQueue,
    RecipeImportProcessor,
    RecipeParserService,
  ],
})
export class RecipesModule {}
