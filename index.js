require('dotenv').config();
const db = require('./database');
const scheduler = require('./scheduler');
const server = require('./server');

// Main function to start the application
async function main() {
  try {
    console.log('Initializing price analyzer...');
    
    // Initialize the database
    console.log('Initializing database...');
    await db.initializeDatabase();
    console.log('Database initialized successfully');
    
    // Schedule price checks for all products
    console.log('Setting up scheduled price checks...');
    await scheduler.scheduleAllProducts();
    
    // Start the web server
    console.log('Starting web server...');
    await server.startServer();
    
    console.log('Price analyzer is running!');
    console.log('Press Ctrl+C to stop');
  } catch (error) {
    console.error('Error starting price analyzer:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down price analyzer...');
  
  // Stop all scheduled jobs
  scheduler.stopAllJobs();
  
  // Close the database connection
  try {
    await db.closeDatabase();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
  
  console.log('Price analyzer stopped');
  process.exit(0);
});

// Start the application
main();
