import db from '../utils/db.js';
import { User } from '../types/user.js';

const authRepository = {
    async findUserByFullName(full_name: string): Promise<User | null> {
        const result = await db.query<User>(
            'SELECT * FROM members WHERE full_name = $1 AND status = $2',
            [full_name, 'active']
        );
        return result.rows[0] || null;
    }
};

export default authRepository;