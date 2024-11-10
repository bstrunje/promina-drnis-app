import { expect } from 'chai';
import request from 'supertest';
import { app, startServer, stopServer } from '../server/server.test.js';
import { describe, it, before, after } from 'mocha';

describe('Members API', function() {
  this.timeout(10000); // Increase timeout to 10 seconds

  before(async function() {
    await startServer();
  });

  after(async function() {
    await stopServer();
  });

  let authToken: string;

  it('should login successfully', async function() {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'bstrunje', password: 'marusic' });

    console.log('Login response:', res.body);
    expect(res.status).to.equal(200);
    authToken = res.body.token;
  });

  it('should GET all members', async function() {
    const res = await request(app)
      .get('/api/members')
      .set('x-auth-token', authToken)
      .set('Authorization', `Bearer ${authToken}`);

    console.log('GET /api/members response:', res.body);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });
});