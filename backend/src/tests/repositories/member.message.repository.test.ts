import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import prisma from '../../utils/prisma.js';
import memberMessageRepo from '../../repositories/member.message.repository.js';
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient();
let memberId: number;
let messageId: number;

describe('member.message.repository', () => {
  beforeAll(async () => {
    // Seed a test member
    const member = await prisma.member.create({ data: {
      first_name: 'MsgTest',
      last_name: 'Tester',
      oib: '00000000007',
      cell_phone: '0910000001',
      city: 'TestCity',
      street_address: 'Test St 7'
    }});
    memberId = member.member_id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.memberMessage.deleteMany({ where: { member_id: memberId } });
    await prisma.member.deleteMany({ where: { member_id: memberId } });
    await client.$disconnect();
  });

  it('create and retrieve message', async () => {
    const msg = await memberMessageRepo.create(memberId, 'Hello!');
    expect(msg).toHaveProperty('message_id');
    expect(msg.member_id).toBe(memberId);
    expect(msg.message_text).toBe('Hello!');
    messageId = msg.message_id;

    const exists = await memberMessageRepo.messageExists(messageId);
    expect(exists).toBe(true);

    const msgs = await memberMessageRepo.getByMemberId(memberId);
    expect(msgs.some(m => m.message_id === messageId)).toBe(true);
  });

  it('mark as read and archive', async () => {
    await memberMessageRepo.markAsRead(messageId);
    let [msg] = await memberMessageRepo.getByMemberId(memberId);
    expect(msg.status).toBe('read');
    expect(msg.read_at).not.toBeNull();

    await memberMessageRepo.archiveMessage(messageId);
    [msg] = await memberMessageRepo.getByMemberId(memberId);
    expect(msg.status).toBe('archived');
  });

  it('delete message and all messages', async () => {
    // delete single
    await memberMessageRepo.deleteMessage(messageId);
    const exists = await memberMessageRepo.messageExists(messageId);
    expect(exists).toBe(false);

    // create two messages
    await memberMessageRepo.create(memberId, 'A');
    await memberMessageRepo.create(memberId, 'B');
    let msgs = await memberMessageRepo.getByMemberId(memberId);
    expect(msgs.length).toBe(2);

    // delete all
    await memberMessageRepo.deleteAllMessages();
    msgs = await memberMessageRepo.getByMemberId(memberId);
    expect(msgs.length).toBe(0);
  });
});
