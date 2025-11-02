import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';

/**
 * @desc    Dohvaća sve vještine za trenutnu organizaciju
 * @route   GET /api/skills
 * @access  Public (za sada, kasnije će možda trebati autentifikacija)
 */
export const getAllSkills = async (req: Request, res: Response) => {
  try {
    // Dohvati organization_id iz tenant middleware-a
    const organizationId = getOrganizationId(req);
    
    const skills = await prisma.skill.findMany({
      where: {
        organization_id: organizationId
      },
      orderBy: {
        id: 'asc', // Sortiramo po ID-u da redoslijed bude konzistentan
      },
    });
    res.status(200).json(skills);
  } catch (error) {
    console.error('Greška prilikom dohvaćanja vještina:', error);
    res.status(500).json({ message: 'Greška prilikom dohvaćanja vještina' });
  }
};

/**
 * @desc    Dohvaća samo vještine koje barem jedan član ima
 * @route   GET /api/skills/used
 * @access  Public
 */
export const getUsedSkills = async (req: Request, res: Response) => {
  try {
    // Dohvati organization_id iz tenant middleware-a
    const organizationId = getOrganizationId(req);

    // 1) Grupiraj member_skills po skill_id i broji SAMO registered članove
    const counts = await prisma.memberSkill.groupBy({
      by: ['skill_id'],
      where: {
        member: {
          organization_id: organizationId,
          status: 'registered'
        },
        skill: {
          organization_id: organizationId
        }
      },
      _count: {
        _all: true
      }
    });

    if (counts.length === 0) {
      res.status(200).json([]);
      return;
    }

    const countMap = new Map<number, number>(counts.map(c => [c.skill_id, c._count._all]));
    const skillIds = counts.map(c => c.skill_id);

    // 2) Dohvati detalje vještina za te ID-ove
    const skills = await prisma.skill.findMany({
      where: {
        organization_id: organizationId,
        id: { in: skillIds }
      },
      select: {
        id: true,
        name: true,
        key: true
      }
    });

    // 3) Mapiraj u postojeći response shape s _count.member_skills = broj registered članova
    const usedSkills = skills
      .map(s => ({
        id: s.id,
        name: s.name,
        key: s.key,
        _count: { member_skills: countMap.get(s.id) ?? 0 }
      }))
      .sort((a, b) => (b._count.member_skills - a._count.member_skills));

    res.status(200).json(usedSkills);
  } catch (error) {
    console.error('Greška prilikom dohvaćanja korištenih vještina:', error);
    res.status(500).json({ message: 'Greška prilikom dohvaćanja korištenih vještina' });
  }
};
