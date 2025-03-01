import { DynamoDB } from 'aws-sdk';

const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

export const dynamoDB = new DynamoDB.DocumentClient({
  region: AWS_REGION
});