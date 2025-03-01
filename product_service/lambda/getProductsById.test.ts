import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./getProductsById";
import { products } from "./mockProducts";

describe("getProductsById Lambda", () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    // Reset the mock event before each test
    mockEvent = {
      pathParameters: {
        id: "",
      },
    };
  });

  it("should return 400 when product ID is missing", async () => {
    mockEvent.pathParameters = null;

    const result = await handler(mockEvent as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Product ID is required",
    });
  });

  it("should return 404 when product is not found", async () => {
    mockEvent.pathParameters = {
      id: "non-existent-id",
    };

    const result = await handler(mockEvent as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      message: "Product not found",
    });
  });

  it("should return 200 with product when found", async () => {
    // Assuming there's at least one product in the mock data
    const testProduct = products[0];
    mockEvent.pathParameters = {
      id: testProduct.id,
    };

    const result = await handler(mockEvent as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(testProduct);
  });

  it("should include CORS headers in the response", async () => {
    mockEvent.pathParameters = {
      id: products[0].id,
    };

    const result = await handler(mockEvent as APIGatewayProxyEvent);

    expect(result.headers).toEqual({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    });
  });

  it("should log the event", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    mockEvent.pathParameters = {
      id: products[0].id,
    };

    await handler(mockEvent as APIGatewayProxyEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      "GetProductsById lambda invoked with event:",
      mockEvent
    );
    consoleSpy.mockRestore();
  });
});
