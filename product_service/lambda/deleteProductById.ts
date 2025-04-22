import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { deleteProduct } from "../services/deleteProduct";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {

  console.log("deleteProductById lambda invoked with event:", event);

  const productId = event.pathParameters?.id;
  if (!productId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: "Product ID is required" }),
    };
  }

  console.log("Deleting product with ID:", productId);

  try {
    await deleteProduct(productId);
    return {
      statusCode: 204,
      headers,
      body: JSON.stringify({ message: "Product deleted successfully" }),
    };
  } catch (error) {
    console.error("Error deleting product:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
