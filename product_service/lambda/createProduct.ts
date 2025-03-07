import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createProduct } from "../services/createProduct";
import { validateProduct } from "../utils/validators";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("CreateProduct lambda invoked with event:", event);
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing body" }),
      headers,
    };
  }
  console.log("CreateProduct body:", event.body);
  const data = JSON.parse(event.body);
  const validation = validateProduct(data);

  if (validation.isError) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: `Validation failed: ${validation.errors.join(", ")}`,
      }),
      headers,
    };
  }
  try {
    const product = await createProduct(data);
    return {
      statusCode: 201,
      body: JSON.stringify(product),
      headers,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error),
      headers,
    };
  }
};
