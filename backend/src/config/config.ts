

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
    server: ServerConfig;
    jwt: JWTConfig;
    cors: CorsConfig;
}

const config: Config = {
    
    server: {
        port: parseInt(process.env.PORT || '3000'),
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