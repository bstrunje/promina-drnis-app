import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import prisma from '../../utils/prisma.js';
import messageService from '../../services/message.service.js';
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient();

describe('message.service', () => {
  let memberId: number;

  beforeEach(async () => {
    // Svaki test dobiva svog člana
    const member = await prisma.member.create({ data: {
      first_name: 'SvcTest',
      last_name: 'Tester',
      oib: faker.string.numeric(11),
      cell_phone: '091' + Math.floor(Math.random() * 1e7).toString().padStart(7, '0'),
      city: 'SvcCity',
      street_address: 'Svc St'
    }});
    memberId = member.member_id;
  });

  afterEach(async () => {
    await prisma.memberMessage.deleteMany({ where: { member_id: memberId } });
    await prisma.member.deleteMany({ where: { member_id: memberId } });
  });

  it('creates and retrieves member message', async () => {
    const msg = await messageService.createMessage(memberId, 'Svc Hello');
    expect(msg.member_id).toBe(memberId);
    const msgs = await messageService.getMemberMessages(memberId);
    expect(msgs.some(m => m.message_id === msg.message_id)).toBe(true);
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
    const msg = await messageService.createMessage(memberId, 'Svc Hello');
    await messageService.markMessageAsRead(msg.message_id);
    let msgs = await messageService.getMemberMessages(memberId);
    let read = msgs.find(m => m.message_id === msg.message_id);
    expect(read?.status).toBe('read');

    await messageService.archiveMessage(msg.message_id);
    msgs = await messageService.getMemberMessages(memberId);
    read = msgs.find(m => m.message_id === msg.message_id);
    expect(read?.status).toBe('archived');
  });

  it('deletes messages', async () => {
    const msg = await messageService.createMessage(memberId, 'Svc Hello');
    await messageService.deleteMessage(msg.message_id);
    let exists = await messageService.messageExists(msg.message_id);
    expect(exists).toBe(false);

    const msg1 = await messageService.createMessage(memberId, 'One');
    const msg2 = await messageService.createMessage(memberId, 'Two');
    let msgs = await messageService.getMemberMessages(memberId);
    expect(msgs.length).toBe(2);

    await messageService.deleteAllMessages();
    msgs = await messageService.getMemberMessages(memberId);
    expect(msgs.length).toBe(0);
  });

  // Ovdje možeš dodati još izoliranih testova po potrebi
});
