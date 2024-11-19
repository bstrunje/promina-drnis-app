import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Error class for database operations
export class DatabaseError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500
    ) {
        super(message);
        this.name = 'DatabaseError';
    }
}

// Pool configuration interface
interface PoolConfig {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}

// Query options interface
interface QueryOptions {
    singleRow?: boolean;
    requireResults?: boolean;
    timeout?: number;
}

// Database configuration
const poolConfig: PoolConfig = {
    user: process.env.DB_USER || 'bozos',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'promina_drnis_DB',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Create pool instance
const pool = new Pool(poolConfig);

// Pool event handlers
pool.on('connect', () => {
    console.log('📦 Database pool connected');
});

pool.on('error', (err: Error) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Database interface
const db = {
    /**
     * Execute a SQL query with proper error handling and logging
     */
    async query<T extends pkg.QueryResultRow = any>(
        textOrConfig: string | pkg.QueryConfig,
        params?: any[],
        options: QueryOptions = {}
    ): Promise<pkg.QueryResult<T>> {
        const start = Date.now();
        const queryConfig = typeof textOrConfig === 'string'
            ? { text: textOrConfig, values: params }
            : textOrConfig;

        try {
            if (options.timeout) {
                await pool.query(`SET statement_timeout TO ${options.timeout}`);
            }

            const result = await pool.query<T>(queryConfig);
            const duration = Date.now() - start;

            if (options.timeout) {
                await pool.query('SET statement_timeout TO DEFAULT');
            }

            console.log({
                query: queryConfig.text,
                duration,
                rows: result.rowCount ?? 0
            });

            if (options.requireResults && (result.rowCount === null || result.rowCount === 0)) {
                throw new DatabaseError('No results found', 404);
            }
            
            if (options.singleRow && result.rowCount !== null && result.rowCount > 1) {
                throw new DatabaseError('Multiple rows found when single row expected', 409);
            }

            return result;
        } catch (error) {
            if (error instanceof Error) {
                console.error('Database query error:', {
                    query: queryConfig.text,
                    error: error.message
                });

                if (error.message.includes('duplicate key')) {
                    throw new DatabaseError('Record already exists', 409);
                }
                if (error.message.includes('foreign key')) {
                    throw new DatabaseError('Referenced record does not exist', 404);
                }
                if (error.message.includes('statement timeout')) {
                    throw new DatabaseError('Query timeout exceeded', 408);
                }
            }
            throw error;
        }
    },

    /**
     * Transaction wrapper
     */
    async transaction<T>(callback: (client: pkg.PoolClient) => Promise<T>): Promise<T> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getClient(): Promise<pkg.PoolClient> {
        return await pool.connect();
    },

    /**
     * Get pool statistics
     */
    getPoolStats() {
        return {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
        };
    },

    /**
     * Check database connection
     */
    async checkConnection(): Promise<boolean> {
        try {
            await this.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Properly close the pool
     */
    async close(): Promise<void> {
        await pool.end();
        console.log('Database pool closed');
    }
};

export default db;