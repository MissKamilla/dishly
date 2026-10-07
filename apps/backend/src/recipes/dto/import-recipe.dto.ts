import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ImportRecipeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url!: string;
}
