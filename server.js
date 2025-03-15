const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const db = require('./database');
const scraper = require('./scraper');
const scheduler = require('./scheduler');

// Create Express app
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Routes

// Home page - List all products
app.get('/', async (req, res) => {
  try {
    const products = await db.getAllProducts();
    
    // Get the latest price for each product
    const productsWithPrices = await Promise.all(
      products.map(async (product) => {
        const latestPrice = await db.getLatestPrice(product.id);
        return {
          ...product,
          latestPrice: latestPrice ? latestPrice.price : null,
          latestCheck: latestPrice ? latestPrice.timestamp : null
        };
      })
    );
    
    res.render('index', { products: productsWithPrices });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send('Error fetching products');
  }
});

// Add product page
app.get('/add-product', (req, res) => {
  res.render('add-product');
});

// Add product form submission
app.post('/add-product', async (req, res) => {
  try {
    const { name, url, selector } = req.body;
    
    // Validate inputs
    if (!name || !url || !selector) {
      return res.status(400).send('Name, URL, and selector are required');
    }
    
    // Test the selector
    const test = await scraper.testSelector(url, selector);
    
    if (!test.success) {
      return res.status(400).send(`Selector test failed: ${test.message}`);
    }
    
    // Add the product to the database
    const productId = await db.addProduct(name, url, selector);
    
    // Record the initial price
    await db.recordPrice(productId, test.price);
    
    // Schedule price checks for the new product
    const products = await db.getAllProducts();
    const product = products.find(p => p.id === productId);
    scheduler.scheduleProduct(product);
    
    res.redirect('/');
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).send(`Error adding product: ${error.message}`);
  }
});

// View product details and price history
app.get('/product/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const products = await db.getAllProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return res.status(404).send('Product not found');
    }
    
    const priceHistory = await db.getPriceHistory(productId);
    
    res.render('product', { product, priceHistory });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).send('Error fetching product details');
  }
});

// Delete product
app.post('/product/:id/delete', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    await db.deleteProduct(productId);
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).send('Error deleting product');
  }
});

// Check price now
app.post('/product/:id/check', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const result = await scheduler.checkProductNow(productId);
    
    if (result.success) {
      res.redirect(`/product/${productId}`);
    } else {
      res.status(500).send(`Error checking price: ${result.error}`);
    }
  } catch (error) {
    console.error('Error checking price:', error);
    res.status(500).send('Error checking price');
  }
});

// API Routes

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const products = await db.getAllProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get price history for a product
app.get('/api/products/:id/prices', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const priceHistory = await db.getPriceHistory(productId);
    res.json(priceHistory);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new product
app.post('/api/products', async (req, res) => {
  try {
    const { name, url, selector } = req.body;
    
    // Validate inputs
    if (!name || !url || !selector) {
      return res.status(400).json({ error: 'Name, URL, and selector are required' });
    }
    
    // Test the selector
    const test = await scraper.testSelector(url, selector);
    
    if (!test.success) {
      return res.status(400).json({ error: `Selector test failed: ${test.message}` });
    }
    
    // Add the product to the database
    const productId = await db.addProduct(name, url, selector);
    
    // Record the initial price
    await db.recordPrice(productId, test.price);
    
    // Schedule price checks for the new product
    const products = await db.getAllProducts();
    const product = products.find(p => p.id === productId);
    scheduler.scheduleProduct(product);
    
    res.status(201).json({ id: productId, name, url, selector });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    await db.deleteProduct(productId);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check price now
app.post('/api/products/:id/check', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const result = await scheduler.checkProductNow(productId);
    res.json(result);
  } catch (error) {
    console.error('Error checking price:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

module.exports = {
  startServer
};
