// backend/src/types/user.ts

export interface User {
    id: number;
    username: string;
    email: string;
    password: string;
    role: string;
    status: string;
    // Add any other fields that your User type should have
  }