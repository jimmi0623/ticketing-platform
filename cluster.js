const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const app = require('./server');

// Master process
if (cluster.isMaster) {
  console.log(`🔄 Master process ${process.pid} is running`);
  console.log(`💻 Starting ${numCPUs} worker processes...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} died`);
    console.log('🔄 Starting a new worker...');
    cluster.fork();
  });

  // Handle worker online
  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Master received SIGTERM, shutting down workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

  process.on('SIGINT', () => {
    console.log('🛑 Master received SIGINT, shutting down workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

} else {
  // Worker process
  console.log(`👷 Worker process ${process.pid} started`);
  
  // Workers can share any TCP connection
  // In this case, it's an HTTP server
  app.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 Worker ${process.pid} listening on port ${process.env.PORT || 5000}`);
  });
}
