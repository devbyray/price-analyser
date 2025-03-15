const cron = require('node-cron');
const db = require('./database');
const scraper = require('./scraper');

// Store active cron jobs
const activeJobs = new Map();

/**
 * Schedule price checks for all products
 * @param {string} cronExpression - Cron expression for scheduling (default: from .env or daily at midnight)
 * @returns {Promise<void>}
 */
async function scheduleAllProducts(cronExpression = process.env.CRON_SCHEDULE || '0 0 * * *') {
  try {
    // Get all products from the database
    const products = await db.getAllProducts();
    
    // Schedule a job for each product
    for (const product of products) {
      scheduleProduct(product, cronExpression);
    }
    
    console.log(`Scheduled price checks for ${products.length} products`);
  } catch (error) {
    console.error('Error scheduling products:', error);
  }
}

/**
 * Schedule price checks for a single product
 * @param {Object} product - Product object from the database
 * @param {string} cronExpression - Cron expression for scheduling
 * @returns {void}
 */
function scheduleProduct(product, cronExpression = process.env.CRON_SCHEDULE || '0 0 * * *') {
  // Cancel any existing job for this product
  if (activeJobs.has(product.id)) {
    activeJobs.get(product.id).stop();
  }
  
  // Create a new cron job
  const job = cron.schedule(cronExpression, async () => {
    try {
      console.log(`Checking price for ${product.name} (ID: ${product.id})`);
      
      // Scrape the current price
      const price = await scraper.scrapePrice(product.url, product.selector);
      
      // Record the price in the database
      await db.recordPrice(product.id, price);
      
      console.log(`Recorded new price for ${product.name}: ${price}`);
    } catch (error) {
      console.error(`Error checking price for ${product.name}:`, error);
    }
  });
  
  // Store the job
  activeJobs.set(product.id, job);
  
  console.log(`Scheduled price check for ${product.name} (ID: ${product.id})`);
}

/**
 * Run an immediate price check for all products
 * @returns {Promise<Array>} - Array of results
 */
async function checkAllProductsNow() {
  try {
    const products = await db.getAllProducts();
    const results = [];
    
    for (const product of products) {
      try {
        console.log(`Checking price for ${product.name} (ID: ${product.id})`);
        
        // Scrape the current price
        const price = await scraper.scrapePrice(product.url, product.selector);
        
        // Record the price in the database
        await db.recordPrice(product.id, price);
        
        results.push({
          productId: product.id,
          name: product.name,
          success: true,
          price
        });
        
        console.log(`Recorded new price for ${product.name}: ${price}`);
      } catch (error) {
        results.push({
          productId: product.id,
          name: product.name,
          success: false,
          error: error.message
        });
        
        console.error(`Error checking price for ${product.name}:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error checking all products:', error);
    throw error;
  }
}

/**
 * Run an immediate price check for a single product
 * @param {number} productId - ID of the product to check
 * @returns {Promise<Object>} - Result object
 */
async function checkProductNow(productId) {
  try {
    // Get the product from the database
    const products = await db.getAllProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    // Scrape the current price
    const price = await scraper.scrapePrice(product.url, product.selector);
    
    // Record the price in the database
    await db.recordPrice(product.id, price);
    
    return {
      productId: product.id,
      name: product.name,
      success: true,
      price
    };
  } catch (error) {
    console.error(`Error checking product ${productId}:`, error);
    return {
      productId,
      success: false,
      error: error.message
    };
  }
}

/**
 * Stop all scheduled jobs
 * @returns {void}
 */
function stopAllJobs() {
  for (const job of activeJobs.values()) {
    job.stop();
  }
  
  activeJobs.clear();
  console.log('Stopped all scheduled price checks');
}

module.exports = {
  scheduleAllProducts,
  scheduleProduct,
  checkAllProductsNow,
  checkProductNow,
  stopAllJobs
};
