import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getProducts } from "../services/getProducts";

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("GetProductsList lambda invoked with event:", event);
  try {
    const products = await getProducts();
    console.log("Products retrieved:", products);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error("Error retrieving products:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
