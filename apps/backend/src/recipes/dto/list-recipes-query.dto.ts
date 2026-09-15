import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { RecipeStatus } from '../enums/recipe-status.enum';

export class ListRecipesQueryDto {
  @Transform(({ value }) => transformStatusQuery(value))
  @IsOptional()
  @IsEnum(RecipeStatus, { each: true })
  status?: RecipeStatus[];
}

function transformStatusQuery(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}
