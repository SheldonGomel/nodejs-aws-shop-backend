import { dynamoDB } from "./db";
import { Product, Stock } from "../types/types";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME || "ProductsTable";
const STOCKS_TABLE = process.env.STOCKS_TABLE_NAME || "StocksTable";

export async function deleteProduct(productId: string) {
  await dynamoDB
    .delete({
      TableName: PRODUCTS_TABLE,
      Key: {
        id: productId,
      },
    })
    .promise();

  await dynamoDB
    .delete({
      TableName: STOCKS_TABLE,
      Key: {
        product_id: productId,
      },
    })
    .promise();
}
