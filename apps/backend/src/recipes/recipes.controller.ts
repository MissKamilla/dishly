import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { ImportRecipeDto } from './dto/import-recipe.dto';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto';
import { RecipeImportService } from './import/recipe-import.service';
import { ParsePositiveIntPipe } from './pipes/parse-positive-int.pipe';
import { RecipesService } from './recipes.service';
import type {
  RecipeDetailsResponse,
  RecipeListItemResponse,
} from './types/recipe-response.types';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly recipeImportService: RecipeImportService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRecipesQueryDto,
  ): Promise<RecipeListItemResponse[]> {
    return this.recipesService.findAllForUser(user.id, query.status);
  }

  @Post('import')
  @HttpCode(HttpStatus.ACCEPTED)
  importRecipe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportRecipeDto,
  ): Promise<RecipeListItemResponse> {
    return this.recipeImportService.requestImport(user.id, dto.url);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  retryImport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParsePositiveIntPipe) recipeId: number,
  ): Promise<void> {
    return this.recipeImportService.requestRetry(user.id, recipeId);
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
