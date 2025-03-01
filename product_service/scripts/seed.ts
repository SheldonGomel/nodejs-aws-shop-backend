// seed.ts
import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME || "ProductsTable";
const STOCKS_TABLE = process.env.STOCKS_TABLE_NAME || "StocksTable";
const AWS_REGION = process.env.AWS_REGION || "eu-west-1";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
}

interface Stock {
  product_id: string;
  count: number;
}

const dynamoDB = new DynamoDB.DocumentClient({
  region: AWS_REGION,
});

const productSamples: Omit<Product, "id">[] = [
  {
    title: "Alpaca White",
    description: "Funny toy white alpaca",
    price: 25,
  },
  {
    title: "Alpaca Brown",
    description: "Funny toy brown alpaca",
    price: 33,
  },
  {
    title: "Alpaca Black",
    description: "Funny toy black alpaca",
    price: 46,
  },
];

async function seedProductsTable(): Promise<string[]> {
  console.log(`Seeding ${PRODUCTS_TABLE}...`);

  const productPromises = productSamples.map((product) => {
    const id = uuidv4();
    const params = {
      TableName: PRODUCTS_TABLE,
      Item: {
        id,
        title: product.title,
        description: product.description,
        price: product.price,
      } as Product,
    };

    console.log(`Adding product: ${product.title}`);
    return {
      promise: dynamoDB.put(params).promise(),
      id,
    };
  });

  const results: string[] = [];
  for (const { promise, id } of productPromises) {
    try {
      await promise;
      results.push(id);
      console.log(`Successfully added product with ID: ${id}`);
    } catch (error) {
      console.error(
        `Failed to add product: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return results;
}

async function seedStocksTable(productIds: string[]): Promise<void> {
  console.log(`Seeding ${STOCKS_TABLE}...`);

  const stockPromises = productIds.map((productId) => {
    // Generate a random stock count between 1 and 100
    const count = Math.floor(Math.random() * 100) + 1;

    const params = {
      TableName: STOCKS_TABLE,
      Item: {
        product_id: productId,
        count,
      } as Stock,
    };

    console.log(`Adding stock for product ID: ${productId}, count: ${count}`);
    return dynamoDB.put(params).promise();
  });

  try {
    await Promise.all(stockPromises);
    console.log("Successfully added all stock items");
  } catch (error) {
    console.error(
      `Failed to add stock items: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function seed(): Promise<void> {
  try {
    console.log(`Using AWS Region: ${AWS_REGION}`);
    console.log(`Products Table: ${PRODUCTS_TABLE}`);
    console.log(`Stocks Table: ${STOCKS_TABLE}`);

    const productIds = await seedProductsTable();

    await seedStocksTable(productIds);

    console.log("Database population completed successfully!");
  } catch (error) {
    console.error(
      `Error in main execution: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exit(1);
  }
}

seed();
