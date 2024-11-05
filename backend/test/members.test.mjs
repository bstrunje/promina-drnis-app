import chai from 'chai';
import chaiHttp from 'chai-http';
import { app, startServer, stopServer } from '../server/server.mjs';

chai.use(chaiHttp);
const expect = chai.expect;

describe('Members API', function() {
  this.timeout(10000); // Increase timeout to 10 seconds

  before(async function() {
    await startServer();
  });

  after(async function() {
    await stopServer();
  });

  let authToken;

  it('should login successfully', function(done) {
    chai.request(app)
      .post('/api/auth/login')
      .send({ username: 'bstrunje', password: 'marusic' })
      .end(function(err, res) {
        console.log('Login response:', res.body);
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        authToken = res.body.token;
        done();
      });
  });

  it('should GET all members', function(done) {
    chai.request(app)
      .get('/api/members')
      .set('x-auth-token', authToken)
      .set('Authorization', `Bearer ${authToken}`)
      .end(function(err, res) {
        console.log('GET /api/members response:', res.body);
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('array');
        done();
      });
  });
});