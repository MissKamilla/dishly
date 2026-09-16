import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Recipe } from './entities/recipe.entity';
import { RecipeStatus } from './enums/recipe-status.enum';
import {
  toRecipeDetailsResponse,
  toRecipeListItemResponse,
} from './recipes.mapper';
import {
  RecipeDetailsResponse,
  RecipeListItemResponse,
} from './types/recipe-response.types';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipesRepository: Repository<Recipe>,
  ) {}

  async findAllForUser(
    userId: number,
    statuses?: RecipeStatus[],
  ): Promise<RecipeListItemResponse[]> {
    const where: FindOptionsWhere<Recipe> = { userId };

    if (statuses && statuses.length > 0) {
      where.status = In(statuses);
    }

    const recipes = await this.recipesRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });

    return recipes.map(toRecipeListItemResponse);
  }

  async findOneForUser(
    userId: number,
    recipeId: number,
  ): Promise<RecipeDetailsResponse> {
    const recipe = await this.recipesRepository.findOne({
      where: {
        id: recipeId,
        userId,
      },
      relations: {
        ingredients: true,
        steps: true,
      },
      order: {
        ingredients: {
          position: 'ASC',
        },
        steps: {
          position: 'ASC',
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return toRecipeDetailsResponse(recipe);
  }

  async deleteForUser(userId: number, recipeId: number): Promise<void> {
    const result = await this.recipesRepository.delete({
      id: recipeId,
      userId,
    });

    if (result.affected !== 1) {
      throw new NotFoundException('Recipe not found');
    }
  }
}
