import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./importProductsFile";
import { getSignedUrl } from "../services/getSignedUrl";

jest.spyOn(console, "log").mockImplementation(() => {}); // Suppress console.log
jest.spyOn(console, "error").mockImplementation(() => {}); // Suppress console.error

// Mock the getSignedUrl service
jest.mock("../services/getSignedUrl");
const mockedGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe("importProductsFile handler", () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    // Reset mock before each test
    jest.clearAllMocks();
    
    // Basic event setup
    mockEvent = {
      httpMethod: "GET",
      queryStringParameters: {},
      pathParameters: null,
    };
  });

  test("should return 400 when filename is missing", async () => {
    const response = await handler(mockEvent as APIGatewayProxyEvent);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: "File name is required"
    });
  });

  test("should return 400 when filename does not end with .csv", async () => {
    mockEvent.queryStringParameters = { name: "test.txt" };

    const response = await handler(mockEvent as APIGatewayProxyEvent);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: "Invalid file name"
    });
  });

  test("should return signed URL when valid CSV filename is provided", async () => {
    const mockSignedUrl = "https://mock-signed-url.com";
    mockedGetSignedUrl.mockResolvedValue(mockSignedUrl);
    mockEvent.queryStringParameters = { name: "test.csv" };

    const response = await handler(mockEvent as APIGatewayProxyEvent);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(mockSignedUrl);
    expect(mockedGetSignedUrl).toHaveBeenCalledWith("test.csv");
  });

  test("should return 500 when getSignedUrl throws error", async () => {
    mockedGetSignedUrl.mockRejectedValue(new Error("Some error"));
    mockEvent.queryStringParameters = { name: "test.csv" };

    const response = await handler(mockEvent as APIGatewayProxyEvent);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "Internal server error"
    });
  });

  test("should include CORS headers in response", async () => {
    mockEvent.queryStringParameters = { name: "test.csv" };
    const mockSignedUrl = "https://mock-signed-url.com";
    mockedGetSignedUrl.mockResolvedValue(mockSignedUrl);

    const response = await handler(mockEvent as APIGatewayProxyEvent);

    expect(response.headers).toEqual({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
  });
});
