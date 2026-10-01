import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';
import { RecipeStep } from '../entities/recipe-step.entity';
import { Recipe } from '../entities/recipe.entity';
import { RecipeStatus } from '../enums/recipe-status.enum';
import { RecipeParserErrorCode } from '../parser/recipe-parser.error';
import { ParsedRecipe } from '../parser/types/parsed-recipe';
import { validateGoodFoodUrl } from '../parser/url-validator';
import { RecipeImportQueue } from '../queue/recipe-import.queue';
import { toRecipeListItemResponse } from '../recipes.mapper';
import { RecipeListItemResponse } from '../types/recipe-response.types';

const QUEUE_UNAVAILABLE_ERROR = 'queue_unavailable';

@Injectable()
export class RecipeImportService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipesRepository: Repository<Recipe>,
    private readonly recipeImportQueue: RecipeImportQueue,
    private readonly dataSource: DataSource,
  ) {}

  async requestImport(
    userId: number,
    inputUrl: string,
  ): Promise<RecipeListItemResponse> {
    const sourceUrl = validateSourceUrl(inputUrl);
    const recipe = this.recipesRepository.create({
      title: null,
      description: null,
      sourceUrl,
      imageUrl: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      status: RecipeStatus.PENDING,
      errorMessage: null,
      userId,
    });
    const savedRecipe = await this.recipesRepository.save(recipe);

    try {
      await this.recipeImportQueue.enqueue(savedRecipe.id);
    } catch (error) {
      await this.recipesRepository.update(
        { id: savedRecipe.id, status: RecipeStatus.PENDING },
        {
          status: RecipeStatus.FAILED,
          errorMessage: QUEUE_UNAVAILABLE_ERROR,
        },
      );

      throw new ServiceUnavailableException(
        'Recipe import is temporarily unavailable',
        { cause: error },
      );
    }

    return toRecipeListItemResponse(savedRecipe);
  }

  findForProcessing(recipeId: number): Promise<Recipe | null> {
    return this.recipesRepository.findOneBy({ id: recipeId });
  }

  async prepareForProcessing(recipeId: number): Promise<boolean> {
    const result = await this.recipesRepository.update(
      {
        id: recipeId,
        status: In([RecipeStatus.PENDING, RecipeStatus.PROCESSING]),
      },
      {
        status: RecipeStatus.PROCESSING,
        errorMessage: null,
      },
    );

    return result.affected === 1;
  }

  async failImport(
    recipeId: number,
    errorCode: RecipeParserErrorCode | 'unexpected_import_error',
  ): Promise<void> {
    await this.recipesRepository.update(
      {
        id: recipeId,
        status: In([RecipeStatus.PENDING, RecipeStatus.PROCESSING]),
      },
      { status: RecipeStatus.FAILED, errorMessage: errorCode },
    );
  }

  completeImport(
    recipeId: number,
    parsedRecipe: ParsedRecipe,
  ): Promise<boolean> {
    return this.dataSource.transaction((manager) =>
      this.saveParsedRecipe(manager, recipeId, parsedRecipe),
    );
  }

  private async saveParsedRecipe(
    manager: EntityManager,
    recipeId: number,
    parsedRecipe: ParsedRecipe,
  ): Promise<boolean> {
    const recipeRepository = manager.getRepository(Recipe);
    const ingredientRepository = manager.getRepository(RecipeIngredient);
    const stepRepository = manager.getRepository(RecipeStep);
    const recipe = await recipeRepository.findOneBy({
      id: recipeId,
      status: RecipeStatus.PROCESSING,
    });

    if (!recipe) {
      return false;
    }

    await ingredientRepository.delete({ recipeId });
    await stepRepository.delete({ recipeId });

    const ingredients = ingredientRepository.create(
      parsedRecipe.ingredients.map((ingredient, index) => ({
        ...ingredient,
        recipeId,
        position: index + 1,
      })),
    );
    const steps = stepRepository.create(
      parsedRecipe.steps.map((step, index) => ({
        ...step,
        recipeId,
        position: index + 1,
      })),
    );

    await ingredientRepository.save(ingredients);
    await stepRepository.save(steps);

    const result = await recipeRepository.update(
      { id: recipeId, status: RecipeStatus.PROCESSING },
      {
        title: parsedRecipe.title,
        description: parsedRecipe.description,
        imageUrl: parsedRecipe.imageUrl,
        servings: parsedRecipe.servings,
        prepTimeMinutes: parsedRecipe.prepTimeMinutes,
        cookTimeMinutes: parsedRecipe.cookTimeMinutes,
        status: RecipeStatus.COMPLETED,
        errorMessage: null,
      },
    );

    if (result.affected !== 1) {
      throw new Error(`Recipe ${recipeId} disappeared during import`);
    }

    return true;
  }
}

function validateSourceUrl(input: string): string {
  try {
    return validateGoodFoodUrl(input).href;
  } catch {
    throw new BadRequestException('Unsupported recipe URL');
  }
}
