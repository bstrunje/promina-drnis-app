// utils/systemManagerTrustedDevices.ts
import crypto from 'crypto';
import prisma from './prisma.js';

/**
 * Generiraj device hash na osnovu User-Agent i IP adrese
 */
export const generateDeviceHash = (userAgent: string, ipAddress: string): string => {
    const deviceString = `${userAgent}:${ipAddress}`;
    return crypto.createHash('sha256').update(deviceString).digest('hex');
};

/**
 * Provjeri je li uređaj trusted za System Manager
 */
export const isTrustedDevice = async (systemManagerId: number, deviceHash: string): Promise<boolean> => {
    try {
        const trustedDevice = await prisma.systemManagerTrustedDevice.findFirst({
            where: {
                system_manager_id: systemManagerId,
                device_hash: deviceHash,
                expires_at: {
                    gt: new Date()
                }
            }
        });

        if (trustedDevice) {
            // Ažuriraj last_used_at
            await prisma.systemManagerTrustedDevice.update({
                where: { id: trustedDevice.id },
                data: { last_used_at: new Date() }
            });
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking trusted device:', error);
        return false;
    }
};

/**
 * Dodaj uređaj kao trusted za System Manager
 */
export const addTrustedDevice = async (
    systemManagerId: number, 
    deviceHash: string, 
    deviceName: string | null = null,
    rememberDays: number = 30
): Promise<void> => {
    try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + rememberDays);

        await prisma.systemManagerTrustedDevice.create({
            data: {
                system_manager_id: systemManagerId,
                device_hash: deviceHash,
                device_name: deviceName,
                expires_at: expiresAt,
                last_used_at: new Date()
            }
        });
    } catch (error) {
        console.error('Error adding trusted device:', error);
        throw error;
    }
};

/**
 * Ukloni trusted device za System Manager
 */
export const removeTrustedDevice = async (systemManagerId: number, deviceHash: string): Promise<void> => {
    try {
        await prisma.systemManagerTrustedDevice.deleteMany({
            where: {
                system_manager_id: systemManagerId,
                device_hash: deviceHash
            }
        });
    } catch (error) {
        console.error('Error removing trusted device:', error);
        throw error;
    }
};

/**
 * Ukloni sve trusted devices za System Manager
 */
export const removeAllTrustedDevices = async (systemManagerId: number): Promise<void> => {
    try {
        await prisma.systemManagerTrustedDevice.deleteMany({
            where: {
                system_manager_id: systemManagerId
            }
        });
    } catch (error) {
        console.error('Error removing all trusted devices:', error);
        throw error;
    }
};

/**
 * Dohvati sve trusted devices za System Manager
 */
export const getTrustedDevices = async (systemManagerId: number) => {
    try {
        return await prisma.systemManagerTrustedDevice.findMany({
            where: {
                system_manager_id: systemManagerId,
                expires_at: {
                    gt: new Date()
                }
            },
            select: {
                id: true,
                device_hash: true,
                device_name: true,
                created_at: true,
                last_used_at: true,
                expires_at: true
            },
            orderBy: {
                last_used_at: 'desc'
            }
        });
    } catch (error) {
        console.error('Error getting trusted devices:', error);
        return [];
    }
};

/**
 * Očisti expired trusted devices za System Manager
 */
export const cleanupExpiredDevices = async (): Promise<void> => {
    try {
        await prisma.systemManagerTrustedDevice.deleteMany({
            where: {
                expires_at: {
                    lt: new Date()
                }
            }
        });
    } catch (error) {
        console.error('Error cleaning up expired devices:', error);
    }
};
