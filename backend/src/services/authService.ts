import { createUser, findUserByEmail } from './userService.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import type { Role, User } from '@prisma/client';

interface RegisterInput {
  name?: string;
  email: string;
  password: string;
  // For security we usually do NOT allow client to pick role.
  // Admins are created manually or via protected endpoint.
  role?: Role;
}

export async function register(input: RegisterInput) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error('Email already in use');
  }

  const user = await createUser({
    name: input.name,
    email: input.email,
    password: input.password,
    role: 'CUSTOMER', // force CUSTOMER for public registration
  });

  const token = signToken({ userId: user.id, role: user.role });

  return { user, token };
}

interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const match = await comparePassword(input.password, user.password);
  if (!match) {
    throw new Error('Invalid credentials');
  }

  const token = signToken({ userId: user.id, role: user.role });

  return { user, token };
}
