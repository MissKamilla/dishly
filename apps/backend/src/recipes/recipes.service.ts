import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './entities/recipe.entity';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipesRepository: Repository<Recipe>,
  ) {}

  async findAllForUser(userId: number): Promise<Recipe[]> {
    return this.recipesRepository.find({
      where: { userId },
    });
  }

  async findOneForUser(
    userId: number,
    recipeId: number,
  ): Promise<Recipe | null> {
    return this.recipesRepository.findOne({
      where: {
        id: recipeId,
        userId,
      },
    });
  }

  async deleteForUser(userId: number, recipeId: number): Promise<boolean> {
    const result = await this.recipesRepository.delete({
      id: recipeId,
      userId,
    });

    return result.affected === 1;
  }
}
