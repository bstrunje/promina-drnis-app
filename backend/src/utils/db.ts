import pkg, { PoolClient } from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export class DatabaseError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500
    ) {
        super(message);
        this.name = 'DatabaseError';
    }
}

interface PoolConfig {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    client_encoding?: string;  // Dodano
    query_timeout?: number;    // Dodano
}

interface QueryOptions {
    singleRow?: boolean;
    requireResults?: boolean;
    timeout?: number;
}

const pool = new Pool(
    process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
        } : undefined
    }
    : {
        database: process.env.DB_NAME || 'promina_drnis_db',
        user: process.env.DB_USER || 'bozos',
        host: process.env.DB_HOST || 'localhost',
        password: process.env.DB_PASSWORD || 'Listopad24$',
        port: parseInt(process.env.DB_PORT || '5432'),
    }
);

pool.on('connect', () => {
    console.log('📦 Database pool connected');
});

pool.on('error', (err) => {
    console.error('⚠️ Unexpected error on idle client', err);
    process.exit(-1);
});

const db = {
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

    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof Error) {
                throw new DatabaseError(error.message);
            }
            throw new DatabaseError('An unknown error occurred');
        } finally {
            client.release();
        }
    },

    async getClient(): Promise<pkg.PoolClient> {
        return await pool.connect();
    },

    getPoolStats() {
        return {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
        };
    },

    async checkConnection(): Promise<boolean> {
        try {
            await this.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    },

    async close(): Promise<void> {
        await pool.end();
        console.log('Database pool closed');
    }
};

export default db;