import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RestApi, LambdaIntegration, Cors } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

const bundling = {
  forceDockerBundling: false, // Disable Docker bundling
};

const lambdaParams = {
  runtime: Runtime.NODEJS_22_X,
  handler: "handler",
  memorySize: 128,
  timeout: Duration.seconds(30),
  bundling,
};

const productsOptions = {
  ...lambdaParams,
  environment:{
    PRODUCTS_TABLE_NAME: "ProductsTable",
    STOCKS_TABLE_NAME: "StocksTable",
  },
};

const importOptions = {
  ...lambdaParams,
  environment: {
    BUCKET_NAME: "aws-rss-backend",
  },
}

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
      ...productsOptions,
    });

    // Create Lambda function for getting product by ID
    const getProductsById = new NodejsFunction(this, "GetProductsById", {
      entry: "product_service/lambda/getProductsById.ts",
      functionName: "get-product-by-id",
      ...productsOptions,
    });

    // Create Lambda function for creating a new product
    const createProduct = new NodejsFunction(this, "CreateProduct", {
      entry: "product_service/lambda/createProduct.ts",
      functionName: "create-product",
      ...productsOptions,
    });

    // Then grant permissions to your Lambda functions
    productsTable.grantReadWriteData(getProductsList);
    productsTable.grantReadWriteData(getProductsById);
    productsTable.grantReadWriteData(createProduct);

    stocksTable.grantReadWriteData(getProductsList);
    stocksTable.grantReadWriteData(getProductsById);
    stocksTable.grantReadWriteData(createProduct);

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

    // POST /products
    productsResource.addMethod("POST", new LambdaIntegration(createProduct));

    // Output the API URL
    new CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    });
  }
}

export class ImportServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create S3 bucket
    const bucket = new s3.Bucket(this, 'ImportBucket', {
      bucketName: 'aws-rss-backend',
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Create Lambda function for importing products file
    const importProductsFile = new NodejsFunction(this, 'ImportProductsFile', {
      functionName: 'import-products-file',
      entry: 'import-service/lambda/importProductsFile.ts',
      ...importOptions,
    });

    // Grant S3 permissions to Lambda
    bucket.grantPut(importProductsFile);
    bucket.grantRead(importProductsFile);

    // Create API Gateway
    const api = new RestApi(this, 'ImportApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type'],
      },
    });

    // Create API resource and method
    const importResource = api.root.addResource('import');

    importResource.addMethod('GET', new LambdaIntegration(importProductsFile), {
      requestParameters: {
        'method.request.querystring.name': true, // Make name parameter required
      },
      requestValidatorOptions: {
        validateRequestParameters: true,
      },
    });

    // Add additional IAM policy for S3 presigned URL generation
    importProductsFile.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [`${bucket.bucketArn}/*`],
      })
    );
  }
}