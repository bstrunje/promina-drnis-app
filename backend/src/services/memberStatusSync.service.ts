// backend/src/services/memberStatusSync.service.ts
import prisma from "../utils/prisma.js";
import db from "../utils/db.js";
import { Request } from "express";
import auditService from "./audit.service.js";

/**
 * Servis za sinkronizaciju statusa članova
 * Osigurava da svi članovi koji imaju broj iskaznice imaju status "registered" i registration_completed=true
 */
const memberStatusSyncService = {
  /**
   * Sinkronizira statuse članova na temelju postojanja broja iskaznice
   * @param req - Express Request objekt (opcionalno za audit log)
   * @returns Broj ažuriranih članova
   */
  async syncMemberStatuses(req?: Request): Promise<{ updatedCount: number }> {
    try {
      console.log("Započinjem sinkronizaciju statusa članova...");
      
      // Dohvati sve članove koji imaju broj iskaznice ali nemaju status "registered" ili registration_completed=false
      const membersToUpdate = await prisma.$queryRaw`
        SELECT m.member_id, m.full_name, m.status, m.registration_completed, md.card_number
        FROM members m
        JOIN membership_details md ON m.member_id = md.member_id
        WHERE (m.status != 'registered' OR m.registration_completed = false)
          AND md.card_number IS NOT NULL 
          AND md.card_number != ''
          AND m.role != 'member_superuser'
      `;
      
      // Pretvaranje rezultata u array ako nije
      const membersArray = Array.isArray(membersToUpdate) ? membersToUpdate : [membersToUpdate];
      
      if (membersArray.length === 0) {
        console.log("Nema članova za ažuriranje statusa.");
        return { updatedCount: 0 };
      }
      
      console.log(`Pronađeno ${membersArray.length} članova za ažuriranje statusa.`);
      
      // Ažuriraj status za svakog člana
      let updatedCount = 0;
      
      for (const member of membersArray) {
        try {
          await prisma.member.update({
            where: { member_id: member.member_id },
            data: {
              status: 'registered',
              registration_completed: true
            }
          });
          
          // Zabilježi promjenu u audit log ako je req dostupan
          if (req) {
            const actionDetails = JSON.stringify({
              action: 'update',
              entity: 'member',
              old: { 
                status: member.status, 
                registration_completed: member.registration_completed 
              }, 
              new: { 
                status: 'registered', 
                registration_completed: true 
              }
            });
            
            await auditService.logAction(
              'member_status_sync',
              req.user?.member_id || null,
              actionDetails,
              req,
              'success',
              member.member_id
            );
          }
          
          console.log(`Ažuriran status člana ${member.full_name} (ID: ${member.member_id}) na "registered".`);
          updatedCount++;
        } catch (error) {
          console.error(`Greška pri ažuriranju statusa člana ${member.member_id}:`, error);
        }
      }
      
      console.log(`Uspješno ažurirano ${updatedCount} članova.`);
      return { updatedCount };
    } catch (error) {
      console.error("Greška pri sinkronizaciji statusa članova:", error);
      throw new Error(`Greška pri sinkronizaciji statusa članova: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
    }
  },
  
  /**
   * Pokreće sinkronizaciju statusa članova i vraća rezultate
   * @param req - Express Request objekt (opcionalno)
   * @returns Rezultat sinkronizacije
   */
  async runSync(req?: Request): Promise<{ success: boolean; message: string; updatedCount: number }> {
    try {
      const { updatedCount } = await this.syncMemberStatuses(req);
      return {
        success: true,
        message: `Sinkronizacija statusa članova uspješno završena. Ažurirano ${updatedCount} članova.`,
        updatedCount
      };
    } catch (error) {
      return {
        success: false,
        message: `Greška pri sinkronizaciji statusa članova: ${error instanceof Error ? error.message : 'Nepoznata greška'}`,
        updatedCount: 0
      };
    }
  }
};

export default memberStatusSyncService;
