import { dynamoDB } from "./db";
import { Product, Stock, UpdateProduct } from "../types/types";
import { AWSError } from "aws-sdk";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME || "ProductsTable";
const STOCKS_TABLE = process.env.STOCKS_TABLE_NAME || "StocksTable";

export const updateProduct = async (product: UpdateProduct) => {
  // Create transaction params
  const transactParams = {
    TransactItems: [
      {
        // Put item in Products table
        Put: {
          TableName: PRODUCTS_TABLE,
          Item: {
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
          } as Product,
        },
      },
      {
        // Put item in Stocks table
        Put: {
          TableName: STOCKS_TABLE,
          Item: {
            product_id: product.id,
            count: product.count,
          } as Stock,
        },
      },
    ],
  };

  try {
    // Execute the transaction
    await dynamoDB.transactWrite(transactParams).promise();
    return product;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw new Error(`Failed to create product: ${(error as AWSError).message}`);
  }
};

updateProduct({
  id: "79ad17b7-8449-4822-8762-ad4bfdecb335",
  title: "Updated Product",
  price: 99,
  description: "This is an updated product",
  count: 50,
})
  .then((product) => {
    console.log("Product updated successfully:", product);
  })
  .catch((error) => {
    console.error("Error updating product:", error);
  });
