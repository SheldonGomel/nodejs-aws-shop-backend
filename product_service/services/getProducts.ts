import { dynamoDB } from "./db";
import { Product, Stock } from "../types/types";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME || "ProductsTable";
const STOCKS_TABLE = process.env.STOCKS_TABLE_NAME || "StocksTable";

export async function getProducts() {
  const productsData = await dynamoDB
    .scan({
      TableName: PRODUCTS_TABLE,
    })
    .promise();

  if (!productsData.Items) return [];

  const stocksData = await dynamoDB
    .scan({
      TableName: STOCKS_TABLE,
    })
    .promise();

  const stocks = (stocksData.Items || []) as Stock[];
  const products = (productsData.Items as Product[]).map((product) => {
    const stock = stocks.find((stock) => stock.product_id === product.id);
    return {
      ...product,
      count: stock ? stock.count : 0,
    };
  });
  return products;
}
