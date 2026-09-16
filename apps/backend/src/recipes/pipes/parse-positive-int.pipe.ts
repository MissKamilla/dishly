import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^\d+$/.test(value)) {
      throw this.createBadRequestException();
    }

    const parsedValue = Number(value);

    if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
      throw this.createBadRequestException();
    }

    return parsedValue;
  }

  private createBadRequestException(): BadRequestException {
    return new BadRequestException('Recipe id must be a positive integer');
  }
}
