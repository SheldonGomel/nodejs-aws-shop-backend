import { dynamoDB } from "./db";
import { Product, Stock } from "../types/types";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME || "ProductsTable";
const STOCKS_TABLE = process.env.STOCKS_TABLE_NAME || "StocksTable";

export async function getProduct(productId: string) {
  const productData = await dynamoDB
    .get({
      TableName: PRODUCTS_TABLE,
      Key: {
        ":id": productId,
      },
    })
    .promise();

  if (!productData.Item) return null;

  const product = productData.Item as Product;

  const stockData = await dynamoDB
    .get({
      TableName: STOCKS_TABLE,
      Key: {
        ":product_id": productId,
      },
    })
    .promise();

  const stock = stockData.Item as Stock;

  return {
    ...product,
    count: stock ? stock.count : 0,
  };
}
