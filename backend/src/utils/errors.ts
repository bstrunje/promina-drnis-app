// src/utils/errors.ts

export class DatabaseError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.name = 'DatabaseError';
        this.statusCode = statusCode;
    }
}

export class NotFoundError extends Error {
    public statusCode: number = 404;

    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends Error {
    public statusCode: number = 400;

    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends Error {
    public statusCode: number = 401;

    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends Error {
    public statusCode: number = 403;

    constructor(message: string) {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export class ConflictError extends Error {
    public statusCode: number = 409;

    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}