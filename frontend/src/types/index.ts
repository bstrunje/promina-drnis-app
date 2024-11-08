// src/types/index.ts

export interface User {
    id: string;
    username: string;
    role: string;
  }
  
  export interface LoginData {
    username: string;
    password: string;
  }
  
  export interface RegisterData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
  }