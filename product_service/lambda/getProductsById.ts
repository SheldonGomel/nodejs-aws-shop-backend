import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getProduct } from '../services/getProduct';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('GetProductsById lambda invoked with event:', event);
    
    const productId = event.pathParameters?.id;

    if (!productId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Product ID is required' })
        };
    }

    try {
        const product = await getProduct(productId);
        if (!product) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Product not found' })
            };
        }
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(product)
        };
    } catch (error) {
        console.error('Error fetching product:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};
