import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

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
    const user = this.usersRepository.create({
      ...data,
      email: this.normalizeEmail(data.email),
    });

    const savedUser = await this.usersRepository.save(user);
    const createdUser = await this.findById(savedUser.id);

    if (!createdUser) {
      throw new Error('Created user could not be loaded');
    }

    return createdUser;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
