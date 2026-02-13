import {prisma} from '../prismaClient.js';
import { hashPassword } from '../utils/password.js';
import type { Role, User } from '@prisma/client';

interface CreateUserInput {
  name?: string;
  email: string;
  password: string;
  role?: Role;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: input.role ?? 'CUSTOMER',
    },
  });
}
