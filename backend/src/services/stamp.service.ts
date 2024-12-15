import stampRepository from '../repositories/stamp.repository.js';
import membershipRepository from '../repositories/membership.repository.js';
import { DatabaseError } from '../utils/errors.js';

const stampService = {
    async getInventoryStatus() {
        try {
            const inventory = await stampRepository.getInventory();
            return inventory.map(item => ({
                ...item,
                remaining: item.initial_count - item.issued_count
            }));
        } catch (error) {
            throw new DatabaseError('Error fetching stamp inventory');
        }
    },

    async updateInitialCount(type: string, count: number) {
        try {
            await stampRepository.updateInventory(type, count);
        } catch (error) {
            throw new DatabaseError('Error updating stamp inventory');
        }
    },

    async issueStamp(memberId: number) {
        try {
            const member = await membershipRepository.getMembershipDetails(memberId);
            if (!member) {
                throw new Error('Member not found');
            }

            let stampType: string;
            switch (member.life_status) {
                case 'employed/unemployed':
                    stampType = 'employed';
                    break;
                case 'child/pupil/student':
                    stampType = 'student';
                    break;
                case 'pensioner':
                    stampType = 'pensioner';
                    break;
                default:
                    throw new Error('Invalid life status');
            }

            await stampRepository.incrementIssuedCount(stampType);
            await membershipRepository.updateMembershipDetails(memberId, {
                card_stamp_issued: true
            });
            
            return { success: true };
        } catch (error) {
            throw new DatabaseError('Error issuing stamp');
        }
    }
};

export default stampService;