import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { products } from './mockProducts';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('GetProductsById lambda invoked with event:', event);
    
    const productId = event.pathParameters?.id;

    if (!productId) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ message: 'Product ID is required' })
        };
    }

    const product = products.find(p => p.id === productId);

    if (!product) {
        return {
            statusCode: 404,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ message: 'Product not found' })
        };
    }

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify(product)
    };
};
