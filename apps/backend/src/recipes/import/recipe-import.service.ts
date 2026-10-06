import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  LessThanOrEqual,
  MoreThan,
  Repository,
} from 'typeorm';
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
const NO_PROCESSING_CLAIM = {
  processingJobId: null,
  processingToken: null,
};

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
      ...NO_PROCESSING_CLAIM,
      userId,
    });
    const savedRecipe = await this.recipesRepository.save(recipe);

    await this.enqueueOrFail(savedRecipe.id, userId);

    return toRecipeListItemResponse(savedRecipe);
  }

  async requestRetry(userId: number, recipeId: number): Promise<void> {
    const result = await this.recipesRepository.update(
      { id: recipeId, userId, status: RecipeStatus.FAILED },
      {
        status: RecipeStatus.PENDING,
        errorMessage: null,
        ...NO_PROCESSING_CLAIM,
      },
    );

    if (result.affected !== 1) {
      const recipe = await this.recipesRepository.findOneBy({
        id: recipeId,
        userId,
      });

      if (!recipe) {
        throw new NotFoundException('Recipe not found');
      }

      throw new ConflictException('Only failed recipes can be retried');
    }

    await this.enqueueOrFail(recipeId, userId);
  }

  private async enqueueOrFail(recipeId: number, userId: number): Promise<void> {
    try {
      await this.recipeImportQueue.enqueue(recipeId);
    } catch (error) {
      await this.recipesRepository.update(
        { id: recipeId, userId, status: RecipeStatus.PENDING },
        { status: RecipeStatus.FAILED, errorMessage: QUEUE_UNAVAILABLE_ERROR },
      );
      throw new ServiceUnavailableException(
        'Recipe import is temporarily unavailable',
        { cause: error },
      );
    }
  }

  findForProcessing(recipeId: number): Promise<Recipe | null> {
    return this.recipesRepository.findOneBy({ id: recipeId });
  }

  async prepareForProcessing(
    recipeId: number,
    jobId: string,
    token: string,
  ): Promise<boolean> {
    const claim = {
      status: RecipeStatus.PROCESSING,
      errorMessage: null,
      processingJobId: jobId,
      processingToken: token,
    };
    const result = await this.recipesRepository.update(
      {
        id: recipeId,
        status: RecipeStatus.PENDING,
      },
      claim,
    );

    if (result.affected === 1) {
      return true;
    }

    // BullMQ may reactivate the same job after its worker loses the lock.
    // A new token fences off writes from the previous execution.
    const reclaimed = await this.recipesRepository.update(
      { id: recipeId, status: RecipeStatus.PROCESSING, processingJobId: jobId },
      claim,
    );
    return reclaimed.affected === 1;
  }

  async releaseForRetry(recipeId: number, token: string): Promise<void> {
    await this.recipesRepository.update(
      { id: recipeId, status: RecipeStatus.PROCESSING, processingToken: token },
      {
        status: RecipeStatus.PENDING,
        ...NO_PROCESSING_CLAIM,
      },
    );
  }

  async failImport(
    recipeId: number,
    token: string,
    errorCode: RecipeParserErrorCode | 'unexpected_import_error',
  ): Promise<void> {
    await this.recipesRepository.update(
      {
        id: recipeId,
        status: RecipeStatus.PROCESSING,
        processingToken: token,
      },
      {
        status: RecipeStatus.FAILED,
        errorMessage: errorCode,
        ...NO_PROCESSING_CLAIM,
      },
    );
  }

  findStaleProcessing(
    before: Date,
    afterId: number,
    limit: number,
  ): Promise<Recipe[]> {
    return this.recipesRepository.find({
      select: { id: true, updatedAt: true, processingJobId: true },
      where: {
        id: MoreThan(afterId),
        status: RecipeStatus.PROCESSING,
        updatedAt: LessThanOrEqual(before),
      },
      order: { id: 'ASC' },
      take: limit,
    });
  }

  findStalePending(
    before: Date,
    afterId: number,
    limit: number,
  ): Promise<Recipe[]> {
    return this.recipesRepository.find({
      select: { id: true },
      where: {
        id: MoreThan(afterId),
        status: RecipeStatus.PENDING,
        updatedAt: LessThanOrEqual(before),
      },
      order: { id: 'ASC' },
      take: limit,
    });
  }

  async failStalePending(recipeId: number, before: Date): Promise<boolean> {
    const result = await this.recipesRepository.update(
      {
        id: recipeId,
        status: RecipeStatus.PENDING,
        updatedAt: LessThanOrEqual(before),
      },
      {
        status: RecipeStatus.FAILED,
        errorMessage: QUEUE_UNAVAILABLE_ERROR,
        ...NO_PROCESSING_CLAIM,
      },
    );

    return result.affected === 1;
  }

  async failStaleProcessing(recipeId: number, before: Date): Promise<boolean> {
    const result = await this.recipesRepository.update(
      {
        id: recipeId,
        status: RecipeStatus.PROCESSING,
        updatedAt: LessThanOrEqual(before),
      },
      {
        status: RecipeStatus.FAILED,
        errorMessage: 'unexpected_import_error',
        ...NO_PROCESSING_CLAIM,
      },
    );

    return result.affected === 1;
  }

  completeImport(
    recipeId: number,
    token: string,
    parsedRecipe: ParsedRecipe,
  ): Promise<boolean> {
    return this.dataSource.transaction((manager) =>
      this.saveParsedRecipe(manager, recipeId, token, parsedRecipe),
    );
  }

  private async saveParsedRecipe(
    manager: EntityManager,
    recipeId: number,
    token: string,
    parsedRecipe: ParsedRecipe,
  ): Promise<boolean> {
    const recipeRepository = manager.getRepository(Recipe);
    const ingredientRepository = manager.getRepository(RecipeIngredient);
    const stepRepository = manager.getRepository(RecipeStep);
    const recipe = await recipeRepository.findOne({
      where: {
        id: recipeId,
        status: RecipeStatus.PROCESSING,
        processingToken: token,
      },
      lock: { mode: 'pessimistic_write' },
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
      { id: recipeId, status: RecipeStatus.PROCESSING, processingToken: token },
      {
        title: parsedRecipe.title,
        description: parsedRecipe.description,
        imageUrl: parsedRecipe.imageUrl,
        servings: parsedRecipe.servings,
        prepTimeMinutes: parsedRecipe.prepTimeMinutes,
        cookTimeMinutes: parsedRecipe.cookTimeMinutes,
        status: RecipeStatus.COMPLETED,
        errorMessage: null,
        ...NO_PROCESSING_CLAIM,
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
