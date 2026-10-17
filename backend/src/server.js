import { app } from './app.js';
import { env } from './config/env.js';
import { startSmsWorker, stopSmsWorker } from './workers/smsWorker.js';

const PORT = env.PORT;

const server = app.listen(PORT, async () => {
  console.log(`🚀 [সবুজ বাংলা সমবায় সমিতি লিঃ] Backend API server listening on http://localhost:${PORT}`);
  console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);

  // Start background SMS worker
  try {
    await startSmsWorker();
  } catch (workerErr) {
    console.error('Failed to start SMS worker:', workerErr);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down backend server...');
  stopSmsWorker();
  server.close(() => {
    console.log('Server closed. Process terminating.');
    process.exit(0);
  });
});

