import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { validateProduct } from "../utils/validators";
import { updateProduct } from "../services/updateProduct";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("UpdateProduct lambda invoked with event:", event);
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing body" }),
      headers,
    };
  }
  console.log("UpdateProduct body:", event.body);
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
    const product = await updateProduct(data);
    return {
      statusCode: 200,
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
