const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

/**
 * Scrape a product price from a website using Puppeteer (headless browser)
 * This is used as a fallback for websites that block regular HTTP requests
 * @param {string} url - The URL of the product page
 * @param {string} selector - CSS selector for the price element
 * @returns {Promise<number>} - The extracted price as a number
 */
async function scrapePriceWithPuppeteer(url, selector) {
  let browser = null;
  try {
    console.log(`Using Puppeteer to scrape ${url}`);
    
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Open a new page
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for the selector to be available
    await page.waitForSelector(selector, { timeout: 5000 });
    
    // Extract the price text
    const priceText = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      return element ? element.textContent.trim() : '';
    }, selector);
    
    // Clean up the price text (remove currency symbols, spaces, etc.)
    let cleanPriceText = priceText.replace(/[^\d.,]/g, '');
    
    // Handle different decimal separators (comma or dot)
    if (cleanPriceText.includes(',') && cleanPriceText.includes('.')) {
      // If both comma and dot are present, the comma is likely a thousands separator
      cleanPriceText = cleanPriceText.replace(/,/g, '');
    } else if (cleanPriceText.includes(',')) {
      // If only comma is present, it's likely a decimal separator
      cleanPriceText = cleanPriceText.replace(',', '.');
    }
    
    // Convert to a number
    const price = parseFloat(cleanPriceText);
    
    if (isNaN(price)) {
      throw new Error(`Failed to parse price from text: ${priceText}`);
    }
    
    return price;
  } catch (error) {
    console.error(`Error scraping with Puppeteer from ${url}:`, error.message);
    throw new Error(`Puppeteer scraping failed: ${error.message}`);
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape a product price from a website
 * @param {string} url - The URL of the product page
 * @param {string} selector - CSS selector for the price element
 * @returns {Promise<number>} - The extracted price as a number
 */
async function scrapePrice(url, selector) {
  try {
    // Set more realistic browser headers to avoid being blocked
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,nl;q=0.8',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };

    // Fetch the product page with a timeout
    const response = await axios.get(url, { 
      headers,
      timeout: 10000,
      maxRedirects: 5
    });
    
    // Load the HTML into cheerio
    const $ = cheerio.load(response.data);
    
    // Extract the price text using the provided selector
    let priceText = $(selector).first().text().trim();
    
    // Clean up the price text (remove currency symbols, spaces, etc.)
    priceText = priceText.replace(/[^\d.,]/g, '');
    
    // Handle different decimal separators (comma or dot)
    if (priceText.includes(',') && priceText.includes('.')) {
      // If both comma and dot are present, the comma is likely a thousands separator
      priceText = priceText.replace(/,/g, '');
    } else if (priceText.includes(',')) {
      // If only comma is present, it's likely a decimal separator
      priceText = priceText.replace(',', '.');
    }
    
    // Convert to a number
    const price = parseFloat(priceText);
    
    if (isNaN(price)) {
      throw new Error(`Failed to parse price from text: ${priceText}`);
    }
    
    return price;
  } catch (error) {
    console.error(`Error scraping price from ${url}:`, error.message);
    
    // Provide specific error messages
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 403) {
          console.log(`Website is blocking access (403 Forbidden). Trying with Puppeteer...`);
          // Try with Puppeteer as a fallback
          return await scrapePriceWithPuppeteer(url, selector);
        } else if (error.response.status === 404) {
          throw new Error(`Product page not found (404). The URL might be incorrect or the product was removed.`);
        } else {
          throw new Error(`Server responded with status code ${error.response.status}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error(`No response received from website. The site might be down or blocking requests.`);
      } else {
        // Something happened in setting up the request
        throw new Error(`Error setting up request: ${error.message}`);
      }
    }
    
    throw error;
  }
}

/**
 * Test a selector on a webpage to see if it extracts a valid price
 * @param {string} url - The URL of the product page
 * @param {string} selector - CSS selector for the price element
 * @returns {Promise<{success: boolean, price?: number, message?: string}>} - Test result
 */
async function testSelector(url, selector) {
  try {
    const price = await scrapePrice(url, selector);
    return {
      success: true,
      price,
      message: `Successfully extracted price: ${price}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to extract price: ${error.message}`
    };
  }
}

module.exports = {
  scrapePrice,
  testSelector
};
