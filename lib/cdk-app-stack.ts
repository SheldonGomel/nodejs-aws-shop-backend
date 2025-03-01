import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RestApi, LambdaIntegration, Cors } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class MyLambdaProjectStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create Lambda function for getting products list
    const getProductsList = new NodejsFunction(this, 'GetProductsList', {
      runtime: Runtime.NODEJS_22_X,
      entry: 'product_service/lambda/getProductsList.ts',
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.seconds(30),
      bundling: {
        externalModules: ['aws-sdk'], // Exclude aws-sdk from bundling
        forceDockerBundling: false,    // Disable Docker bundling
      },
    });

    // Create Lambda function for getting product by ID
    const getProductsById = new NodejsFunction(this, 'GetProductsById', {
      runtime: Runtime.NODEJS_22_X,
      entry: 'product_service/lambda/getProductsById.ts',
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.seconds(30),
      bundling: {
        externalModules: ['aws-sdk'], // Exclude aws-sdk from bundling
        forceDockerBundling: false,    // Disable Docker bundling
      },
    });

    // Create API Gateway
    const api = new RestApi(this, 'ProductsApi', {
      restApiName: 'Products Service',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      deploy: true,
      deployOptions: {
        stageName: 'dev',
      },
    });

    // Add products resource
    const productsResource = api.root.addResource('products');
    
    // GET /products
    productsResource.addMethod('GET', new LambdaIntegration(getProductsList));

    // GET /products/{id}
    const productById = productsResource.addResource('{id}');
    productById.addMethod('GET', new LambdaIntegration(getProductsById));

    // Output the API URL
    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
