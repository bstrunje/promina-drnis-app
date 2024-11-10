// tests/server/server.ts
import { Server } from 'http';
import { app } from '../../src/server';  // Adjust this path as needed

let server: Server;
const TEST_PORT = 3000;  // You might want to use a different port for testing

async function startServer(): Promise<Server> {
  try {
    server = app.listen(TEST_PORT);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    console.log(`Test server started on port ${TEST_PORT}`);
    return server;
  } catch (error) {
    console.error('Failed to start test server:', error);
    throw error;
  }
}

async function stopServer(): Promise<void> {
  if (server) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('Test server stopped');
    } catch (error) {
      console.error('Failed to stop test server:', error);
      throw error;
    }
  }
}

export { app, startServer, stopServer };