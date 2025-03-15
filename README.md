# Price Analyzer

A Node.js application that tracks product prices from websites on a daily basis.

## Features

- Track prices from any website using CSS selectors
- Automatically check prices daily
- View price history with charts
- Simple web interface for managing products
- RESTful API for programmatic access

## Requirements

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/price-analyzer.git
   cd price-analyzer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables (optional):
   - Copy `.env.example` to `.env` (if not already present)
   - Modify settings in `.env` as needed

## Usage

### Starting the Application

```
npm start
```

The application will be available at http://localhost:3000 (or the port specified in your .env file).

### Adding a Product to Track

1. Click "Add New Product" on the home page
2. Enter the product details:
   - **Name**: A descriptive name for the product
   - **URL**: The full URL of the product page
   - **Selector**: A CSS selector that targets the price element on the page

#### Finding the CSS Selector

1. Visit the product page in your browser
2. Right-click on the price and select "Inspect" or "Inspect Element"
3. Look at the HTML element that contains the price
4. Create a CSS selector that uniquely identifies this element
   - Examples: `.price`, `#product-price`, `span.current-price`

### Viewing Price History

Click on a product name in the product list to view its price history, including a chart and detailed records.

### Checking Prices Manually

You can manually check the current price of a product by clicking the "Check Now" button on the product list or product details page.

## API Documentation

The application provides a RESTful API for programmatic access:

### Get All Products

```
GET /api/products
```

### Get Product by ID

```
GET /api/products/:id
```

### Get Price History for a Product

```
GET /api/products/:id/prices
```

### Add a New Product

```
POST /api/products
```

Body:
```json
{
  "name": "Product Name",
  "url": "https://example.com/product",
  "selector": ".price"
}
```

### Delete a Product

```
DELETE /api/products/:id
```

### Check Price Now

```
POST /api/products/:id/check
```

## License

MIT
