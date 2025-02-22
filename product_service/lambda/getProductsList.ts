import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { products } from './mockProducts';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('GetProductsList lambda invoked with event:', event);
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify(products)
    };
};
