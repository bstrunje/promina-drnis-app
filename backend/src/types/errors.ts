// src/types/errors.ts

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