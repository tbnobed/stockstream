// Health check endpoint for Docker and load balancers
import { db } from './db.js';

export async function healthCheck(req, res) {
  try {
    // Check database connection
    await db.execute('SELECT 1');
    
    // Basic application health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime(),
      pid: process.pid
    };

    res.status(503).json(health);
  }
}