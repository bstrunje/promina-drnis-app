import crypto from 'crypto';
import { Request } from 'express';
import prisma from './prisma.js';

/**
 * Generira hash za identifikaciju uređaja na temelju User-Agent i IP adrese
 */
export function generateDeviceHash(req: Request): string {
  const userAgent = req.get('User-Agent') || 'unknown';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Kombiniramo User-Agent i IP za jedinstveni device fingerprint
  const deviceString = `${userAgent}|${ip}`;
  
  // Kreiramo SHA-256 hash
  return crypto.createHash('sha256').update(deviceString).digest('hex');
}

/**
 * Ekstraktira ime uređaja iz User-Agent stringa
 */
export function extractDeviceName(req: Request): string {
  const userAgent = req.get('User-Agent') || 'Unknown Device';
  
  // Jednostavna logika za ekstraktiranje browser info
  if (userAgent.includes('Chrome')) return 'Chrome Browser';
  if (userAgent.includes('Firefox')) return 'Firefox Browser';
  if (userAgent.includes('Safari')) return 'Safari Browser';
  if (userAgent.includes('Edge')) return 'Edge Browser';
  
  return 'Unknown Browser';
}

/**
 * Provjera je li uređaj trusted za određenog člana
 */
export async function isTrustedDevice(
  organizationId: number,
  memberId: number,
  deviceHash: string
): Promise<boolean> {
  try {
    const trustedDevice = await prisma.trustedDevice.findFirst({
      where: {
        organization_id: organizationId,
        member_id: memberId,
        device_hash: deviceHash,
        expires_at: {
          gt: new Date() // Provjeri da nije istekao
        }
      }
    });

    if (trustedDevice) {
      // Ažuriraj last_used_at
      await prisma.trustedDevice.update({
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
}

/**
 * Dodaje uređaj u trusted devices listu
 */
export async function addTrustedDevice(
  organizationId: number,
  memberId: number,
  deviceHash: string,
  deviceName: string,
  rememberDays: number
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + rememberDays);

    await prisma.trustedDevice.upsert({
      where: {
        organization_id_member_id_device_hash: {
          organization_id: organizationId,
          member_id: memberId,
          device_hash: deviceHash
        }
      },
      update: {
        expires_at: expiresAt,
        last_used_at: new Date(),
        device_name: deviceName
      },
      create: {
        organization_id: organizationId,
        member_id: memberId,
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
}

/**
 * Uklanja istekle trusted devices (cleanup job)
 */
export async function cleanupExpiredTrustedDevices(): Promise<number> {
  try {
    const result = await prisma.trustedDevice.deleteMany({
      where: {
        expires_at: {
          lt: new Date()
        }
      }
    });

    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired trusted devices:', error);
    return 0;
  }
}
