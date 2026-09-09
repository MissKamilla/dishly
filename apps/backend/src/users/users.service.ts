import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPostgresUniqueViolation } from '../database/postgres-error';
import { USER_EMAIL_UNIQUE_CONSTRAINT, User } from './entities/user.entity';
import { DuplicateUserEmailError } from './errors/duplicate-user-email.error';

type CreateUserData = {
  email: string;
  passwordHash: string;
  name: string;
  language?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: this.normalizeEmail(email) })
      .getOne();
  }

  async create(data: CreateUserData): Promise<User> {
    const normalizedEmail = this.normalizeEmail(data.email);
    const user = this.usersRepository.create({
      ...data,
      email: normalizedEmail,
    });

    const savedUser = await this.saveUser(user);
    const createdUser = await this.findById(savedUser.id);

    if (!createdUser) {
      throw new Error('Created user could not be loaded');
    }

    return createdUser;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async saveUser(user: User): Promise<User> {
    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      if (isPostgresUniqueViolation(error, USER_EMAIL_UNIQUE_CONSTRAINT)) {
        throw new DuplicateUserEmailError();
      }

      throw error;
    }
  }
}
