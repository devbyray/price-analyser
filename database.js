const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Create or open the SQLite database
const dbPath = path.join(dataDir, 'price_history.db');
const db = new sqlite3.Database(dbPath);

// Initialize the database with required tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          url TEXT NOT NULL UNIQUE,
          selector TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create price_history table
      db.run(`
        CREATE TABLE IF NOT EXISTS price_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          price REAL NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

// Add a new product to track
function addProduct(name, url, selector) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO products (name, url, selector) VALUES (?, ?, ?)',
      [name, url, selector],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

// Record a new price for a product
function recordPrice(productId, price) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO price_history (product_id, price) VALUES (?, ?)',
      [productId, price],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

// Get all products
function getAllProducts() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Get price history for a product
function getPriceHistory(productId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM price_history WHERE product_id = ? ORDER BY timestamp DESC',
      [productId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

// Get the latest price for a product
function getLatestPrice(productId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM price_history WHERE product_id = ? ORDER BY timestamp DESC LIMIT 1',
      [productId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

// Delete a product and its price history
function deleteProduct(productId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM price_history WHERE product_id = ?', [productId]);
      db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  });
}

// Close the database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  initializeDatabase,
  addProduct,
  recordPrice,
  getAllProducts,
  getPriceHistory,
  getLatestPrice,
  deleteProduct,
  closeDatabase
};
