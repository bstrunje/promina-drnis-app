import { Request, Response } from 'express';
import { Member } from '../../shared/types/member.js';
import prisma from '../../utils/prisma.js';
import { parseDate, cleanISODateString } from '../../utils/dateUtils.js';
import { tOrDefault } from '../../utils/i18n.js';
import { getOrganizationId } from '../../middleware/tenant.middleware.js';

export async function registerInitialHandler(
  req: Request<
    Record<string, never>,
    Record<string, never>,
    Omit<
      Member,
      |
        'member_id' |
        'status' |
        'role' |
        'total_hours' |
        'password_hash' |
        'last_login'
    >
  >,
  res: Response
): Promise<void> {
  const locale = req.locale;
  try {
    // Dohvati organization_id iz tenant middleware-a
    let organizationId: number;
    try {
      organizationId = getOrganizationId(req);
    } catch (_e) {
      res.status(400).json({ code: 'TENANT_REQUIRED', message: 'Organization context is required' });
      return;
    }
    const { first_name, last_name, email } = req.body;

    // Check if member with email already exists
    const memberExists = await prisma.member.findFirst({
      where: { email },
      select: { member_id: true }
    });

    if (memberExists) {
      res
        .status(400)
        .json({ code: 'AUTH_REGISTRATION_DUP_EMAIL', message: tOrDefault('auth.errorsByCode.AUTH_REGISTRATION_DUP_EMAIL', locale, 'Member with this email already exists') });
      return;
    }

    // Create new member with required fields
    const member = await prisma.member.create({
      data: {
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`,
        email,
        organization_id: organizationId, // multi-tenant: veži člana uz organizaciju
        oib: '', // Temporary empty value - will be filled during registration
        cell_phone: '', // Temporary empty value
        city: '', // Temporary empty value
        street_address: '', // Temporary empty value
        status: 'pending',
        role: 'member'
      },
      select: {
        member_id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        nickname: true
      }
    });

    res.status(201).json({
      message: tOrDefault('auth.success.AUTH_REGISTER_PRE_CREATED_OK', locale, 'Member pre-registered successfully. Awaiting administrator password configuration.'),
      member_id: member.member_id,
      full_name: `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ''}`,
      email: member.email,
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error) {
      res.status(500).json({ code: 'AUTH_REGISTRATION_FAILED', message: tOrDefault('auth.errorsByCode.AUTH_REGISTRATION_FAILED', locale, error.message) });
    } else {
      res.status(500).json({ code: 'AUTH_REGISTRATION_FAILED', message: tOrDefault('auth.errorsByCode.AUTH_REGISTRATION_FAILED', locale, 'Error registering member') });
    }
  }
}

export async function registerMemberHandler(
  req: Request<
    Record<string, never>,
    Record<string, never>,
    Omit<
      Member,
      'member_id' | 'password_hash' | 'total_hours' | 'last_login' | 'full_name'
    > & { skills?: { skill_id: number; is_instructor?: boolean }[]; other_skills?: string }
  >,
  res: Response
): Promise<void> {
  const locale = req.locale;
  try {
    // Dohvati organization_id iz tenant middleware-a
    let organizationId: number;
    try {
      organizationId = getOrganizationId(req);
    } catch (_e) {
      res.status(400).json({ code: 'TENANT_REQUIRED', message: 'Organization context is required' });
      return;
    }
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      street_address,
      city,
      oib,
      cell_phone,
      email,
      life_status,
      tshirt_size,
      shell_jacket_size,
      skills,
      other_skills
    } = req.body;

    const existingMember = await prisma.member.findUnique({ where: { oib } });
    if (existingMember) {
      res.status(400).json({
        code: 'AUTH_REGISTRATION_DUP_OIB',
        message: tOrDefault('auth.errorsByCode.AUTH_REGISTRATION_DUP_OIB', locale, 'Member with this OIB already exists'),
      });
      return;
    }

    let formattedDateOfBirth = date_of_birth;

    if (date_of_birth && typeof date_of_birth === 'string') {
      if (date_of_birth.length === 10) {
        const parsedDate = parseDate(`${date_of_birth}T00:00:00.000Z`);
        formattedDateOfBirth = parsedDate.toISOString();
        console.log(`Formatiran datum rođenja: ${formattedDateOfBirth}`);
      } else {
        formattedDateOfBirth = cleanISODateString(date_of_birth);
        console.log(`Očišćen datum rođenja: ${formattedDateOfBirth}`);
      }
    }

    const newMember = await prisma.$transaction(async (tx) => {
      const createdCoreMember = await tx.member.create({
        data: {
          first_name,
          last_name,
          full_name: `${first_name} ${last_name}`,
          date_of_birth: new Date(date_of_birth),
          gender,
          street_address,
          city,
          oib,
          cell_phone,
          email,
          life_status,
          tshirt_size,
          shell_jacket_size,
          other_skills,
          organization_id: organizationId, // multi-tenant: veži člana uz organizaciju
          status: 'pending',
          role: 'member',
          registration_completed: false,
        },
      });

      if (skills && Array.isArray(skills) && skills.length > 0) {
        const skillCreations = skills.map((skill: { skill_id: number, is_instructor: boolean }) => {
            return tx.memberSkill.create({
                data: {
                    member_id: createdCoreMember.member_id,
                    skill_id: skill.skill_id,
                    is_instructor: skill.is_instructor || false,
                },
            });
        });
        await Promise.all(skillCreations);
      }

      return createdCoreMember;
    });

    res.status(201).json({
      message: tOrDefault('success.AUTH_REGISTER_COMPLETED_OK', locale, 'Member registered successfully'),
      member: newMember,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      code: 'AUTH_REGISTRATION_FAILED',
      message: tOrDefault('errorsByCode.AUTH_REGISTRATION_FAILED', locale, error instanceof Error ? error.message : 'Registration failed'),
    });
  }
}
