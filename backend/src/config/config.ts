import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: path.resolve(process.cwd(), '..', envFile) });

interface DatabaseConfig {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
}

interface ServerConfig {
    port: number;
    nodeEnv: string;
}

interface JWTConfig {
    secret: string;
    expiresIn: string;
}

interface CorsConfig {
    origin: string;
    methods: string[];
    allowedHeaders: string[];
}

interface Config {
    database: DatabaseConfig;
    server: ServerConfig;
    jwt: JWTConfig;
    cors: CorsConfig;
}

const config: Config = {
    database: {
        user: process.env.DB_USER || 'bozos',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'promina_drnis_db',
        password: process.env.DB_PASSWORD || 'Listopad24$',
        port: parseInt(process.env.DB_PORT || '5432'),
    },
    
    server: {
        port: parseInt(process.env.PORT || '3000'), // Dodali port property nazad
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: '24h',
    },
    
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }
};

export default config;