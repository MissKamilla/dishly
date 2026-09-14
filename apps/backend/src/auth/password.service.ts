import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      type: argon2id,
    });
  }

  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
