import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from '../entities/recipe.entity';
import { RecipeStatus } from '../enums/recipe-status.enum';
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
}

function validateSourceUrl(input: string): string {
  try {
    return validateGoodFoodUrl(input).href;
  } catch {
    throw new BadRequestException('Unsupported recipe URL');
  }
}
