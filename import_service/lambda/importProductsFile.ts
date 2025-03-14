import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getSignedUrl } from "../services/getSignedUrl";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log(
      "ImportProductsFile lambda has been invoked with event: ",
      JSON.stringify(event)
    );
    console.log("Query parameters: ", event.queryStringParameters);
    console.log("Path parameters: ", event.pathParameters);
    console.log("HTTP method: ", event.httpMethod);

    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "File name is required" }),
        headers,
      };
    }

    const isValidFileName = fileName.endsWith(".csv");
    if (!isValidFileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid file name" }),
        headers,
      };
    }

    const signedUrl = await getSignedUrl(fileName);

    return {
      statusCode: 200,
      body: signedUrl,
      headers,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
      headers,
    };
  }
};
