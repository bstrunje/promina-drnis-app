import { Request, Response } from 'express';
import { PoolClient } from 'pg';
import { Member } from '../../shared/types/member.js';
import db, { DatabaseError } from '../../utils/db.js';
import prisma from '../../utils/prisma.js';
import { parseDate, cleanISODateString } from '../../utils/dateUtils.js';

export async function registerInitialHandler(
  req: Request<
    {},
    {},
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
  try {
    const { first_name, last_name, email } = req.body;

    const memberExists = await db.query<Member>(
      'SELECT * FROM members WHERE email = $1',
      [email],
      { singleRow: true }
    );

    if (memberExists?.rowCount && memberExists.rowCount > 0) {
      res
        .status(400)
        .json({ message: 'Member with this email already exists' });
      return;
    }

    await db.transaction(async (client: PoolClient) => {
      const result = await client.query<Member>(
        `INSERT INTO members (
                        first_name, last_name, email, status, role
                    ) VALUES ($1, $2, $3, 'pending', 'member')
                    RETURNING member_id, first_name, last_name, email, role`,
        [first_name, last_name, email]
      );

      const member = result.rows[0];
      res.status(201).json({
        message:
          'Member pre-registered successfully. Awaiting administrator password configuration.',
        member_id: member.member_id,
        full_name: `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ''}`,
        email: member.email,
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof DatabaseError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Error registering member' });
    }
  }
}

export async function registerMemberHandler(
  req: Request<
    {},
    {},
    Omit<
      Member,
      'member_id' | 'password_hash' | 'total_hours' | 'last_login' | 'full_name'
    > & { skills?: any, other_skills?: string }
  >,
  res: Response
): Promise<void> {
  try {
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
        message: 'Member with this OIB already exists',
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
      message: 'Member registered successfully',
      member: newMember,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message:
        error instanceof Error ? error.message : 'Registration failed',
    });
  }
}
