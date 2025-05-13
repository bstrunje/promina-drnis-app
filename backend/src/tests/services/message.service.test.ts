import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import prisma from '../../utils/prisma.js';
import messageService from '../../services/message.service.js';
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient();
let memberId: number;
let messageId: number;

describe('message.service', () => {
  beforeAll(async () => {
    // Seed test member
    const member = await prisma.member.create({ data: {
      first_name: 'SvcTest',
      last_name: 'Tester',
      oib: '00000000008',
      cell_phone: '0910000002',
      city: 'SvcCity',
      street_address: 'Svc St'
    }});
    memberId = member.member_id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.memberMessage.deleteMany({ where: { member_id: memberId } });
    await prisma.member.deleteMany({ where: { member_id: memberId } });
    await client.$disconnect();
  });

  it('creates and retrieves member message', async () => {
    const msg = await messageService.createMessage(memberId, 'Svc Hello');
    expect(msg.member_id).toBe(memberId);
    messageId = msg.message_id;
    const msgs = await messageService.getMemberMessages(memberId);
    expect(msgs.some(m => m.message_id === messageId)).toBe(true);
  });

  it('admin messaging flows', async () => {
    const adminId = memberId;
    // send to all
    const aMsgAll = await messageService.createAdminMessage(adminId, null, 'All Svc', 'all', 'admin');
    expect(aMsgAll.recipient_type).toBe('all');

    // get all for admin
    const adminMsgs = await messageService.getAdminMessages();
    expect(adminMsgs.length).toBeGreaterThanOrEqual(1);

    // get sent by admin
    const sent = await messageService.getMessagesSentByAdmin(adminId);
    expect(sent.some(m => m.message_id === aMsgAll.message_id)).toBe(true);
  });

  it('marks read and archives', async () => {
    await messageService.markMessageAsRead(messageId);
    let msgs = await messageService.getMemberMessages(memberId);
    let read = msgs.find(m => m.message_id === messageId);
    expect(read?.status).toBe('read');

    await messageService.archiveMessage(messageId);
    msgs = await messageService.getMemberMessages(memberId);
    read = msgs.find(m => m.message_id === messageId);
    expect(read?.status).toBe('archived');
  });

  it('deletes messages', async () => {
    await messageService.deleteMessage(messageId);
    let exists = await messageService.messageExists(messageId);
    expect(exists).toBe(false);

    await messageService.createMessage(memberId, 'One');
    await messageService.createMessage(memberId, 'Two');
    let msgs = await messageService.getMemberMessages(memberId);
    expect(msgs.length).toBe(2);

    await messageService.deleteAllMessages();
    msgs = await messageService.getMemberMessages(memberId);
    expect(msgs.length).toBe(0);
  });
});
