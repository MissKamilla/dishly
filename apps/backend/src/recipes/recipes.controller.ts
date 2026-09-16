import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto';
import { ParsePositiveIntPipe } from './pipes/parse-positive-int.pipe';
import { RecipesService } from './recipes.service';
import type {
  RecipeDetailsResponse,
  RecipeListItemResponse,
} from './types/recipe-response.types';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRecipesQueryDto,
  ): Promise<RecipeListItemResponse[]> {
    return this.recipesService.findAllForUser(user.id, query.status);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParsePositiveIntPipe) recipeId: number,
  ): Promise<RecipeDetailsResponse> {
    return this.recipesService.findOneForUser(user.id, recipeId);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParsePositiveIntPipe) recipeId: number,
  ): Promise<void> {
    return this.recipesService.deleteForUser(user.id, recipeId);
  }
}
