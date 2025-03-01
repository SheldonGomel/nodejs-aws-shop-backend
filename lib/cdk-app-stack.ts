import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RestApi, LambdaIntegration, Cors } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

const environment = {
  PRODUCTS_TABLE_NAME: "ProductsTable",
  STOCKS_TABLE_NAME: "StocksTable",
};

const bundling = {
  forceDockerBundling: false, // Disable Docker bundling
};

const options = {
  runtime: Runtime.NODEJS_22_X,
  handler: "handler",
  memorySize: 128,
  timeout: Duration.seconds(30),
  bundling,
  environment,
};

export class MyLambdaProjectStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const productsTable = new dynamodb.Table(this, 'ProductsTable', {
      tableName: 'ProductsTable',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN, // RETAIN to keep the table when stack is deleted, or DESTROY to remove it
    });
    
    const stocksTable = new dynamodb.Table(this, 'StocksTable', {
      tableName: 'StocksTable',
      partitionKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN, 
    });
    // Create Lambda function for getting products list
    const getProductsList = new NodejsFunction(this, "GetProductsList", {
      entry: "product_service/lambda/getProductsList.ts",
      functionName: "get-products-list",
      ...options,
    });

    // Create Lambda function for getting product by ID
    const getProductsById = new NodejsFunction(this, "GetProductsById", {
      entry: "product_service/lambda/getProductsById.ts",
      functionName: "get-product-by-id",
      ...options,
    });

    // Then grant permissions to your Lambda functions
    productsTable.grantReadWriteData(getProductsList);
    productsTable.grantReadWriteData(getProductsById);

    stocksTable.grantReadWriteData(getProductsList);
    stocksTable.grantReadWriteData(getProductsById);

    // Create API Gateway
    const api = new RestApi(this, "ProductsApi", {
      restApiName: "Products Service",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      deploy: true,
      deployOptions: {
        stageName: "dev",
      },
    });

    // Add products resource
    const productsResource = api.root.addResource("products");

    // GET /products
    productsResource.addMethod("GET", new LambdaIntegration(getProductsList));

    // GET /products/{id}
    const productById = productsResource.addResource("{id}");
    productById.addMethod("GET", new LambdaIntegration(getProductsById));

    // Output the API URL
    new CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    });
  }
}
