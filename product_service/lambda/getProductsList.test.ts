import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './getProductsList';
import { products } from './mockProducts';

describe('getProductsList lambda', () => {
    let mockEvent: APIGatewayProxyEvent;

    beforeEach(() => {
        // Setup mock event before each test
        mockEvent = {
            httpMethod: 'GET',
            body: null,
            headers: {},
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: {},
            path: '/products',
            pathParameters: {},
            queryStringParameters: {},
            requestContext: {} as any,
            resource: '',
            stageVariables: {},
        };

        // Spy on console.log
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        // Clear all mocks after each test
        jest.clearAllMocks();
    });

    it('should return status code 200', async () => {
        const response = await handler(mockEvent);
        expect(response.statusCode).toBe(200);
    });

    it('should return correct CORS headers', async () => {
        const response = await handler(mockEvent);
        expect(response.headers).toEqual({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        });
    });

    it('should return all products in the response body', async () => {
        const response = await handler(mockEvent);
        const responseBody = JSON.parse(response.body);
        expect(responseBody).toEqual(products);
    });

    it('should log the event when invoked', async () => {
        await handler(mockEvent);
        expect(console.log).toHaveBeenCalledWith(
            'GetProductsList lambda invoked with event:',
            mockEvent
        );
    });

    it('should return valid JSON in the response body', async () => {
        const response = await handler(mockEvent);
        expect(() => JSON.parse(response.body)).not.toThrow();
    });
});
