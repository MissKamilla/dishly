import { BadRequestException } from '@nestjs/common';
import { ParsePositiveIntPipe } from './parse-positive-int.pipe';

describe('ParsePositiveIntPipe', () => {
  let pipe: ParsePositiveIntPipe;

  beforeEach(() => {
    pipe = new ParsePositiveIntPipe();
  });

  it('parses a positive integer', () => {
    expect(pipe.transform('123')).toBe(123);
  });

  it.each(['0', '-1', '1.5', 'abc', ''])(
    'rejects %s as a recipe id',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
    },
  );
});
