// Make sure tsconfig.json has `"typeRoots": ["./src/types", "./node_modules/@types"]`

declare global {
  namespace Express {
    interface UserPayload {
      userId: number;
      role: 'CUSTOMER' | 'ADMIN';
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
