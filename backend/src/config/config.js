require('dotenv').config();

module.exports = {
    // Database configuration
    db: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    },
    
    // Server configuration
    server: {
        port: parseInt(process.env.PORT || '3000'),
    },
    
    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: '24h',
    },
    
    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }
};