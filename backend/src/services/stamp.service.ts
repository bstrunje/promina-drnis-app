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
            if (count < 0) {
                throw new Error('Initial count cannot be negative');
            }
    
            const inventory = await stampRepository.getInventory();
            const currentInventory = inventory.find(item => item.stamp_type === type);
            
            if (currentInventory && count < currentInventory.issued_count) {
                throw new Error('New count cannot be less than already issued stamps');
            }
    
            await stampRepository.updateInventory(type, count);
        } catch (error) {
            throw new DatabaseError(
                'Error updating stamp inventory: ' + 
                (error instanceof Error ? error.message : 'Unknown error')
            );
        }
    },

    async issueStamp(memberId: number) {
        try {
            const member = await membershipRepository.getMembershipDetails(memberId);
            if (!member) {
                throw new Error('Member not found');
            }

            // Determine stamp type based on life status
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

            // Check if stamp is available in inventory
            const inventory = await stampRepository.getInventory();
            const stampInventory = inventory.find(item => item.stamp_type === stampType);
            
            if (!stampInventory) {
                throw new Error(`No inventory found for ${stampType} stamps`);
            }

            if (stampInventory.initial_count <= stampInventory.issued_count) {
                throw new Error(`No ${stampType} stamps available in inventory`);
            }

            // Issue stamp and update inventory
            await stampRepository.incrementIssuedCount(stampType);
            await membershipRepository.updateMembershipDetails(memberId, {
                card_stamp_issued: true
            });
            
            return { success: true };
        } catch (error) {
            throw new DatabaseError('Error issuing stamp: ' + 
                (error instanceof Error ? error.message : 'Unknown error'));
        }
    }
};

export default stampService;