import { dynamoDB } from "./db";
import { v4 as uuidv4 } from "uuid";
import { CreateProduct, Product, Stock } from "../types/types";
import { AWSError } from "aws-sdk";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME || "ProductsTable";
const STOCKS_TABLE = process.env.STOCKS_TABLE_NAME || "StocksTable";

export const createProduct = async (product: CreateProduct) => {

  const id = uuidv4();

  // Create transaction params
  const transactParams = {
    TransactItems: [
      {
        // Put item in Products table
        Put: {
          TableName: PRODUCTS_TABLE,
          Item: {
            id,
            title: product.title,
            description: product.description,
            price: product.price,
          } as Product
        }
      },
      {
        // Put item in Stocks table
        Put: {
          TableName: STOCKS_TABLE,
          Item: {
            product_id: id,
            count: product.count
          } as Stock
        }
      }
    ]
  };

  try {
    // Execute the transaction
    await dynamoDB.transactWrite(transactParams).promise();
    return {id, ...product};
  } catch (error) {
    console.error('Transaction failed:', error);
    throw new Error(`Failed to create product: ${(error as AWSError).message}`);
  }
}
